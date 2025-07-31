.PHONY: default build clean docs git-hook pretty lint test coverage universe
.SECONDARY:

ifneq "$(CI)" ""
	DEBUG ?= 1
endif

START ?= 1980
END ?= 2000
ORIGIN ?= 1983-12-25

_HORIZON := $(ORIGIN)_$(START)_$(END)

PREFIX ?= universe_

_UNIVERSE_NAME := $(PREFIX)$(_HORIZON)
_UNIVERSE := output/$(_UNIVERSE_NAME)
_SEGMENTS := $(wildcard $(_UNIVERSE)-segment.*.gv)
_TIMELINES := $(wildcard timelines/* ~/timelines/*.yml)
_DEBUG := output/_$(_UNIVERSE_NAME)

_SCOUR_FLAGS = --enable-viewboxing --enable-id-stripping --enable-comment-stripping --shorten-ids --indent=none
ifneq ($(DEBUG),)
	_SCOUR_FLAGS += --verbose
endif

_VARIANTS := cairo.svg default.svg png
_VARIANTS_IMG := $(patsubst %,img.%, $(_VARIANTS))
_VARIANTS_PUBLISH := cairo.svg cairo.min.svg default.svg default.min.svg png
_DOT_FLAGS := -Gcenter=false -Gimagepath=output -Gmargin=0 -Gpad=0
ifneq ($(DEBUG),)
	_DOT_FLAGS += -v5
endif

_UNIVERSE_FLAGS :=
ifneq ($(DEBUG),)
	_UNIVERSE_FLAGS += --debug
endif

_PRETTY_BIOME := npm exec -- biome check --write --no-errors-on-unmatched


default: build docs universe

build: lib/timeline.js

lib: node_modules
	npm exec -- tsc --build tsconfig.json

schema:
	@for i in schemas/*.yml; do yq --output-format=json eval '(.. | select(key == "$$ref" and type == "!!str")) |= sub(".schema.yml", ".schema.json")' "$$i" > "$${i%.yml}.json"; done

_site output:
	mkdir -p $@

output/images: | output
	node --enable-source-maps contrib/prepare-emoji.js
	cp contrib/wikimedia/* $@/

$(_UNIVERSE)-img.svg &: \
	$(foreach _, $(_SEGMENTS), $(patsubst %.gv, %-img.dot.svg, $(_)))
	node --enable-source-maps contrib/svgcat.js \
		--target=$@ $^
$(_UNIVERSE).svg &: \
	$(foreach _, $(_SEGMENTS), $(patsubst %.gv, %.dot.svg, $(_)))
	node --enable-source-maps contrib/svgcat.js \
		--target=$@ $^

universe:
	$(MAKE) $(_UNIVERSE).gv
	$(MAKE) $(_UNIVERSE)-img.svg $(_UNIVERSE)-img.min.svg $(_UNIVERSE).svg $(_UNIVERSE).min.svg
	node --enable-source-maps examples/build-site.js \
		--output=output $(_UNIVERSE).gv

# Compress an SVG by applying lossy XML transformations.
%.min.svg: %.svg
	scour $(_SCOUR_FLAGS) -i $< -o $@
	@date +"%FT%T%z Generated minified $@."

# Render a vector SVG document from the given GraphViz document,
# using the Cairo renderer. This renderer transforms text into
# paths, which makes the SVG layout more consistent between display
# devices, but loses the ability to search the document for text.
# Additionally, the Cairo renderer currently produces unexpected output
# for embedded images. It is unclear if the output or the viewer application
# is to blame.
%.dot.cairo.svg: %.dot
	dot $(_DOT_FLAGS) -Tsvg:cairo -o$@ $<
	@date +"%FT%T%z Rendered Cairo SVG $@."

# Render a vector SVG document from the given GraphViz document.
%.dot.svg: %.dot
	dot $(_DOT_FLAGS) -Tsvg -o$@ $<
	@date +"%FT%T%z Rendered SVG $@."

# Render a rasterized PNG image from the given GraphViz document.
%.dot.png: %.dot
	dot $(_DOT_FLAGS) -Tpng -o$@ $<
	@date +"%FT%T%z Rendered PNG $@."

# Build individual dot layout phases.
# These can NOT be used incrementally, as the layout engine always starts
# in phase 1, regardless of the input (to be confirmed!). When this was
# attempted, the build failed for multiple segments reliably.
%-p1.dot: %.dot
	dot $(_DOT_FLAGS) -Tdot -Gphase=1 -o$@ $<
	@date +"%FT%T%z Generated dot layout phase 1 $@."
%-p2.dot: %.dot
	dot $(_DOT_FLAGS) -Tdot -Gphase=2 -o$@ $<
	@date +"%FT%T%z Generated dot layout phase 2 $@."
%-p3.dot: %.dot
	dot $(_DOT_FLAGS) -Tdot -Gphase=3 -o$@ $<
	@date +"%FT%T%z Generated dot layout phase 3 $@."
%-p4.dot: %.dot
	dot $(_DOT_FLAGS) -Tdot -Gphase=4 -o$@ $<
	@date +"%FT%T%z Generated dot layout phase 4 $@."
%-p999.dot: %.dot
	dot $(_DOT_FLAGS) -Tdot -Gphase=999 -o$@ $<
	@date +"%FT%T%z Generated dot layout phase 999 $@."

# Embed (emoji) prefixes as <IMG> elements in the label.
# At time of implementation, this output did not render well
# with cairo.
%-img.dot: %.dot output/images | output
	node --enable-source-maps examples/emojify.js \
		--assets=output/images \
		--target=$<
	@date +"%FT%T%z Embedded prefixes into $@."

%.dot: %.gv
	dot -Tcanon -o$@ $<
	@date +"%FT%T%z Normalized GraphViz document $@."

# Render a GraphViz document in DOT language, which represents the
# requested slice from the universe.
%.gv: lib node_modules | output
	node --enable-source-maps examples/universe.js $(_UNIVERSE_FLAGS) \
		--origin=$(word 2, $(subst _, ,$@)) \
		--skip-before=$(word 3, $(subst _, ,$@)) \
		--skip-after=$(subst .gv,,$(word 4, $(subst _, ,$@))) \
		--output=$@ \
		$(_TIMELINES)
	@date +"%FT%T%z Generated GraphViz document $@."

# Not actually referenced in the implementation. Contains the library code
# for usage somewhere else.
lib/timeline.js: node_modules | lib
	node build.js

# Not really important. Artifact generation for GitHub Pages publishing.
docs: _site/index.html
_site/index.html: $(_UNIVERSE).zen.html | _site
	cp $(_UNIVERSE).zen.html _site/index.html

# Clean up all build artifacts.
clean:
	rm --force --recursive _site lib
	find -iname "callgrind.out.*" -delete
	find -iwholename "schemas/*.schema.json" -delete
# Additionally delete all stored dependencies.
purge: clean
	rm --force --recursive .venv node_modules

# Register a git hook to run "make pretty" before each commit.
git-hook:
	echo "make pretty" > .git/hooks/pre-commit; chmod +x .git/hooks/pre-commit

# Normalizes the style of as many documents in the repository as possible.
pretty: node_modules
	$(_PRETTY_BIOME)
	npm pkg fix
	@for i in schemas/*.yml; do yq --prettyPrint --inplace "$$i"; done

# Ensure all source documents are valid, as far as can be determined statically.
lint: node_modules validate-data
	npm exec -- biome check .
	npm exec -- tsc --build --clean tsconfig.json
	npm exec -- tsc --build tsconfig.json

# Validate all schemas to be valid JSON schema documents.
validate-schema: .venv
	. .venv/bin/activate; cd schemas; check-jsonschema --schemafile "https://json-schema.org/draft/2019-09/schema" *.yml

# Validate all data to be valid timeline documents.
validate-data: .venv validate-schema
	. .venv/bin/activate; cd schemas; check-jsonschema --schemafile spec.schema.yml ../timelines/*.yml

# Run available software tests.
test: node_modules lib
	TZ=UTC node --enable-source-maps --inspect node_modules/.bin/mocha --reporter-option maxDiffSize=16000 lib/*.test.js
coverage: node_modules lib
	NODE_OPTIONS=--enable-source-maps TZ=UTC npm exec -- c8 --reporter=html-spa mocha --reporter-option maxDiffSize=16000 lib/*.test.js

# Python dependency handling
.venv: .venv/touchfile
.venv/touchfile: requirements.txt
	test -d .venv || virtualenv .venv
	. .venv/bin/activate; pip install -Ur requirements.txt
	touch .venv/touchfile

# Nodejs dependency handling
node_modules:
# This check is a hack for GitHub CI environments. The graphviz in the APT repo
# may or may not work as expected. The lab environment uses a locally built
# version of GraphViz.
ifneq "$(CI)" ""
	sudo apt-get update; sudo apt-get install graphviz scour virtualenv
endif
	npm install
