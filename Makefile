.PHONY: default build clean docs git-hook pretty lint test coverage universe
.SECONDARY:

START ?= 1800
END ?= 2030

_HORIZON := $(START)-$(END)

PREFIX ?= universe_

_UNIVERSE_NAME := $(PREFIX)$(_HORIZON)
_UNIVERSE := output/$(_UNIVERSE_NAME)
_SEGMENTS := $(wildcard $(_UNIVERSE)-segment.*.gv)
_TIMELINES := $(filter-out %.auto.yml, $(wildcard ~/timelines/*.yml ~/timelines/*/*.yml))
_AUTO_TIMELINES := $(patsubst %.yml,%.auto.yml,$(_TIMELINES))
_DEBUG := output/_$(_UNIVERSE_NAME)

_SCOUR_FLAGS = --enable-viewboxing --enable-id-stripping --enable-comment-stripping --shorten-ids --indent=none
ifneq ($(DEBUG),)
	_SCOUR_FLAGS += --verbose
endif

_DOT_FLAGS := -Gcenter=false -Gimagepath=output/images -Gmargin=0 -Gpad=0
ifneq ($(DEBUG),)
	_DOT_FLAGS += -v5
endif

_UNIVERSE_FLAGS := "--origin=$(ORIGIN)" --segment=100
ifneq ($(DEBUG),)
	_UNIVERSE_FLAGS += --debug
endif
ifneq ($(PRIVATE),)
	_UNIVERSE_FLAGS += --private
endif

default: build docs universe

build: lib/timeline.js

lib: node_modules
	@npm exec -- tsc --build tsconfig.json

schema:
	@for i in schemas/*.yml; do \
		yq --output-format=json \
		eval '(.. | select(key == "$$ref" and type == "!!str")) |= sub(".schema.yml", ".schema.json")' \
		"$$i" > "$${i%.yml}.json"; \
		done

_site output:
	mkdir -p $@

output/images: | output
	node --enable-source-maps contrib/prepare-emoji.js
	cp contrib/wikimedia/* $@/
	node --enable-source-maps examples/emojify.js --copy-only

$(_UNIVERSE)-img.svg &: \
	$(foreach _, $(_SEGMENTS), $(patsubst %.gv,%-img.dot.svg,$(_)))
	node --enable-source-maps contrib/svgcat.js \
		--target=$@ $^
$(_UNIVERSE).svg &: \
	$(foreach _, $(_SEGMENTS), $(patsubst %.gv,%.dot.svg,$(_)))
	node --enable-source-maps contrib/svgcat.js \
		--target=$@ $^

universe:
	$(MAKE) $(_UNIVERSE).gv
	$(MAKE) $(_UNIVERSE)-img.svg $(_UNIVERSE)-img.min.svg
# $(_UNIVERSE).svg $(_UNIVERSE).min.svg
	node --enable-source-maps examples/build-site.js \
		--output=output $(_UNIVERSE).gv

pedigree: $(_AUTO_TIMELINES) lib node_modules | output
	@node --enable-source-maps examples/ancestry.js \
		"--origin=$(ORIGIN)" \
		--output=output/ancestry.gv $(_AUTO_TIMELINES)
	dot -O -Tpng -Tsvg output/ancestry.gv

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
%.dot.cairo.svg %.dot.cairo.svg.log: %.dot
ifneq ($(DEBUG),)
	>$@.log 2>&1 dot $(_DOT_FLAGS) -Tsvg:cairo -o $@ $<
else
	dot $(_DOT_FLAGS) -Tsvg:cairo -o $@ $<
endif
	@date +"%FT%T%z Rendered Cairo SVG $@."

# Render a vector SVG document from the given GraphViz document.
%.dot.svg %.dot.svg.log: %.dot
ifneq ($(DEBUG),)
	>$@.log 2>&1 dot $(_DOT_FLAGS) -Tsvg -o $@ $<
else
	dot $(_DOT_FLAGS) -Tsvg -o $@ $<
endif
	@date +"%FT%T%z Rendered SVG $@."

# Render a rasterized PNG image from the given GraphViz document.
%.dot.png %.dot.png.log: %.dot
ifneq ($(DEBUG),)
	>$@.log 2>&1 dot $(_DOT_FLAGS) -Tpng -o $@ $<
else
	dot $(_DOT_FLAGS) -Tpng -o $@ $<
endif
	@date +"%FT%T%z Rendered PNG $@."

# Build individual dot layout phases.
# These can NOT be used incrementally, as the layout engine always starts
# in phase 1, regardless of the input (to be confirmed!). When this was
# attempted, the build failed for multiple segments reliably.
%-p1.dot %-p1.dot.log: %.dot
ifneq ($(DEBUG),)
	>$@.log 2>&1 dot $(_DOT_FLAGS) -Tdot -Gphase=1 -o $@ $<
else
	dot $(_DOT_FLAGS) -Tdot -Gphase=1 -o $@ $<
endif
	@date +"%FT%T%z Generated dot layout phase 1 $@."
%-p2.dot %-p2.dot.log: %.dot
ifneq ($(DEBUG),)
	>$@.log 2>&1 dot $(_DOT_FLAGS) -Tdot -Gphase=2 -o $@ $<
else
	dot $(_DOT_FLAGS) -Tdot -Gphase=2 -o $@ $<
endif
	@date +"%FT%T%z Generated dot layout phase 2 $@."
%-p3.dot %-p3.dot.log: %.dot
ifneq ($(DEBUG),)
	>$@.log 2>&1 dot $(_DOT_FLAGS) -Tdot -Gphase=3 -o $@ $<
else
	dot $(_DOT_FLAGS) -Tdot -Gphase=3 -o $@ $<
endif
	@date +"%FT%T%z Generated dot layout phase 3 $@."
%-p4.dot %-p4.dot.log: %.dot
ifneq ($(DEBUG),)
	>$@.log 2>&1 dot $(_DOT_FLAGS) -Tdot -Gphase=4 -o $@ $<
else
	dot $(_DOT_FLAGS) -Tdot -Gphase=4 -o $@ $<
endif
	@date +"%FT%T%z Generated dot layout phase 4 $@."
%-p999.dot %-p999.dot.log: %.dot
ifneq ($(DEBUG),)
	>$@.log 2>&1 dot $(_DOT_FLAGS) -Tdot -Gphase=999 -o $@ $<
else
	dot $(_DOT_FLAGS) -Tdot -Gphase=999 -o $@ $<
endif
	@date +"%FT%T%z Generated dot layout phase 999 $@."

# Embed (emoji) prefixes as <IMG> elements in the label.
# At time of implementation, this output did not render well
# with cairo.
%-img.dot: %.dot output/images | output
	node --enable-source-maps examples/emojify.js \
		--assets=output/images \
		--target=$<
	@date +"%FT%T%z Embedded prefixes into $@."

%.dot %.dot.log: %.gv
ifneq ($(DEBUG),)
	>$@.log 2>&1 dot -v5 -Tcanon -o $@ $<
else
	dot -Tcanon -o $@ $<
endif
	@date +"%FT%T%z Normalized GraphViz document $@."

# Render a GraphViz document in DOT language, which represents the
# requested slice from the universe.
%.gv: $(_AUTO_TIMELINES) lib node_modules | output
	@node --enable-source-maps examples/universe.js $(_UNIVERSE_FLAGS) \
		--skip-before=$(word 2, $(subst _, ,$@)) \
		--skip-after=$(subst .gv,,$(word 4, $(subst _, ,$@))) \
		--output=$@ \
		$(_AUTO_TIMELINES)
	@date +"%FT%T%z Generated GraphViz document $@."

%.auto.yml: %.yml lib node_modules
	@>$@ node --enable-source-maps examples/person.js --target=$<

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
	@rm --force --recursive _site lib
	@find -iname "callgrind.out.*" -delete
	@find -iwholename "schemas/*.schema.json" -delete
# Additionally delete all stored dependencies.
purge: clean
	rm --force --recursive .venv node_modules

# Register a git hook to run "make pretty" before each commit.
git-hook:
	echo "make pretty" > .git/hooks/pre-commit; chmod +x .git/hooks/pre-commit

# Normalizes the style of as many documents in the repository as possible.
pretty: node_modules
	npm exec -- biome check --unsafe --write
	npm pkg fix
	@for i in schemas/*.yml; do yq --prettyPrint --inplace "$$i"; done

# Ensure all source documents are valid, as far as can be determined statically.
lint: node_modules validate-data
	npm exec -- biome check .
	npm exec -- tsc --build --clean tsconfig.json
	npm exec -- tsc --build tsconfig.json

# Validate all schemas to be valid JSON schema documents.
validate-schema: .venv
	. .venv/bin/activate; cd schemas; \
	check-jsonschema \
		--schemafile "https://json-schema.org/draft/2019-09/schema" \
		*.yml

# Validate all data to be valid timeline documents.
validate-data: .venv validate-schema
	. .venv/bin/activate; cd schemas; \
	check-jsonschema \
		--schemafile spec.schema.yml \
		../timelines/*.yml

# Run available software tests.
test: node_modules lib
	TZ=UTC node --enable-source-maps --inspect \
		node_modules/.bin/mocha --reporter-option maxDiffSize=16000 \
		lib/*.test.js
coverage: node_modules lib
	NODE_OPTIONS=--enable-source-maps TZ=UTC npm exec -- \
		c8 --reporter=html-spa \
		mocha --reporter-option maxDiffSize=16000 \
		lib/*.test.js

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
