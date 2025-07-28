.PHONY: default build clean docs git-hook pretty lint test

ifneq "$(CI)" ""
	DEBUG := 1
endif

START ?= 1980
END ?= 2000
ORIGIN ?= 1983-12-25

_SEGMENT := $(ORIGIN)_$(START)_$(END)

PREFIX ?= universe_

_UNIVERSE_NAME := $(PREFIX)$(_SEGMENT)
_UNIVERSE := output/$(_UNIVERSE_NAME)
_TIMELINES := $(wildcard timelines/* ~/timelines/*.yml)
_DEBUG := output/_$(_UNIVERSE_NAME)

_SCOUR_FLAGS = --enable-viewboxing --enable-id-stripping --enable-comment-stripping --shorten-ids --indent=none
ifneq ($(DEBUG),)
	_SCOUR_FLAGS += --verbose
endif

_VARIANTS := cairo.svg default.svg png
_VARIANTS_IMG := $(patsubst %,img.%, $(_VARIANTS))
_VARIANTS_PUBLISH := cairo.svg cairo.min.svg default.svg default.min.svg png
_DOT_FLAGS := -Gimagepath=output
ifneq ($(DEBUG),)
	_DOT_FLAGS += -v5
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

universe: $(_UNIVERSE).zen.html

# wip
_PARTS := 1700_1820 1820_1860 1860_1880 1880_1900 1900_1910 1910_1920 1920_1930 1930_1940 1940_1950 1950_1960 1960_1970 1970_1980 1980_1990 1990_2000 2000_2010 2010_2020 2020_2030
_PARTFILES := $(patsubst %, output/$(PREFIX)$(ORIGIN)_%, $(_PARTS))
_PARTS_GV := $(patsubst %, %.gv, $(_PARTFILES))
_PARTS_GV_SVG := $(patsubst %, %.gv.svg, $(_PARTFILES))
_PARTS_GV_CAIRO_SVG := $(patsubst %, %.gv.cairo.svg, $(_PARTFILES))
_PARTS_IMG_GV := $(patsubst %, %.img.gv, $(_PARTFILES))
_PARTS_IMG_GV_SVG := $(patsubst %, %.img.gv.svg, $(_PARTFILES))
_PARTS_IMG_GV_CAIRO_SVG := $(patsubst %, %.img.gv.cairo.svg, $(_PARTFILES))
_PARTS_IMG_P1_DOT := $(patsubst %, %.p1.img.dot, $(_PARTFILES))
_PARTS_IMG_P2_DOT := $(patsubst %, %.p2.img.dot, $(_PARTFILES))
_PARTS_IMG_P3_DOT := $(patsubst %, %.p3.img.dot, $(_PARTFILES))
_PARTS_IMG_P4_DOT := $(patsubst %, %.p4.img.dot, $(_PARTFILES))
_PARTS_IMG_P999_DOT := $(patsubst %, %.p999.img.dot, $(_PARTFILES))
_PARTS_P1_DOT := $(patsubst %, %.p1.dot, $(_PARTFILES))
_PARTS_P2_DOT := $(patsubst %, %.p2.dot, $(_PARTFILES))
_PARTS_P3_DOT := $(patsubst %, %.p3.dot, $(_PARTFILES))
_PARTS_P4_DOT := $(patsubst %, %.p4.dot, $(_PARTFILES))
_PARTS_P999_DOT := $(patsubst %, %.p999.dot, $(_PARTFILES))
newuniverse: \
	output/images \
	$(_PARTS_GV) \
	$(_PARTS_GV_SVG) \
	$(_PARTS_GV_CAIRO_SVG) \
	$(_PARTS_IMG_GV) \
	$(_PARTS_IMG_GV_SVG) \
	$(_PARTS_IMG_GV_CAIRO_SVG) \
	$(_PARTS_IMG_P1_DOT) \
	$(_PARTS_IMG_P2_DOT) \
	$(_PARTS_IMG_P3_DOT) \
	$(_PARTS_IMG_P4_DOT) \
	$(_PARTS_IMG_P999_DOT)
	$(_PARTS_P1_DOT) \
	$(_PARTS_P2_DOT) \
	$(_PARTS_P3_DOT) \
	$(_PARTS_P4_DOT) \
	$(_PARTS_P999_DOT)

%.zen.html %.system.html %.compat.html %.safe.html &: $(foreach _, $(_VARIANTS_PUBLISH), $(_UNIVERSE).$(_) $(_UNIVERSE).img.$(_)) $(_UNIVERSE).gv $(_UNIVERSE).img.gv
	node examples/build-site.js --output=output $(_UNIVERSE).gv
	$(_PRETTY_BIOME)

# Compress an SVG by applying lossy XML transformations.
%.min.svg: %.svg
	scour $(_SCOUR_FLAGS) -i $^ -o $@

# Render a vector SVG document from the given GraphViz document,
# using the Cairo renderer. This renderer transforms text into
# paths, which makes the SVG layout more consistent between display
# devices, but loses the ability to search the document for text.
# Additionally, the Cairo renderer currently produces unexpected output
# for embedded images. It is unclear if the output or the viewer application
# is to blame.
%.gv.cairo.svg: %.gv
	@date +"Cairo SVG render process starts %FT%T%z"
	dot $(_DOT_FLAGS) -Tsvg:cairo -o $@ $<
	@date +"Cairo SVG render process exits %FT%T%z"

# Render a vector SVG document from the given GraphViz document.
%.gv.svg: %.gv
	@date +"SVG render process starts %FT%T%z"
	dot $(_DOT_FLAGS) -Tsvg -o $@ $<
	@date +"SVG render process exits %FT%T%z"

# Render a rasterized PNG image from the given GraphViz document.
%.gv.png: %.gv
	dot $(_DOT_FLAGS) -Tpng -o $@ $<

# Render a GraphViz document in DOT language, which represents the
# requested slice from the universe.
%.gv: lib node_modules | output
	node --enable-source-maps examples/universe.js \
		--origin=$(word 2, $(subst _, ,$@)) \
		--skip-before=$(word 3, $(subst _, ,$@)) \
		--skip-after=$(subst .gv,,$(word 4, $(subst _, ,$@))) \
		--output=$@ \
		$(_TIMELINES)
	dot -Tcanon -o $@ $@

# Build individual dot layout phases.
# These can NOT be used incrementally, as the layout engine always starts
# in phase 1, regardless of the input (to be confirmed!). When this was
# attempted, the build failed for multiple segments reliably.
%.p1.dot: %.gv
	dot $(_DOT_FLAGS) -Tdot -Gphase=1 -o $@ $<
%.p2.dot: %.gv
	dot $(_DOT_FLAGS) -Tdot -Gphase=2 -o $@ $<
%.p3.dot: %.gv
	dot $(_DOT_FLAGS) -Tdot -Gphase=3 -o $@ $<
%.p4.dot: %.gv
	dot $(_DOT_FLAGS) -Tdot -Gphase=4 -o $@ $<
%.p999.dot: %.gv
	dot $(_DOT_FLAGS) -Tdot -Gphase=999 -o $@ $<

# Embed (emoji) prefixes as <IMG> elements in the label.
# At time of implementation, this output did not render well
# with cairo.
%.img.dot: %.dot output/images | output
	node --enable-source-maps examples/emojify.js \
		--assets=output/images \
		--target=$<
%.img.gv: %.gv output/images | output
	node --enable-source-maps examples/emojify.js \
		--assets=output/images \
		--target=$<

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
