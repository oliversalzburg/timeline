.PHONY: default build clean docs git-hook pretty lint test

ifneq "$(CI)" ""
	DEBUG := 1
endif

START ?= 1980
END ?= 2000
ORIGIN ?= 1983-12-25

_SEGMENT := $(ORIGIN)_$(START)_$(END)

OUTPUT ?= output
PREFIX ?= universe_

_UNIVERSE_NAME := $(PREFIX)$(_SEGMENT)
_UNIVERSE := $(OUTPUT)/$(_UNIVERSE_NAME)
_TIMELINES := $(wildcard timelines/* ~/timelines/*.yml)
_DEBUG := $(OUTPUT)/_$(_UNIVERSE_NAME)

_SCOUR_FLAGS = --enable-viewboxing --enable-id-stripping --enable-comment-stripping --shorten-ids --indent=none
ifneq ($(DEBUG),)
	_SCOUR_FLAGS += --verbose
endif

_VARIANTS := cairo.svg default.svg png
_VARIANTS_IMG := $(patsubst %,img.%, $(_VARIANTS))
_VARIANTS_PUBLISH := cairo.svg cairo.min.svg default.svg default.min.svg png
_DOT_FLAGS := -O -Tpng -Tsvg -Tsvg:cairo
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

_site $(OUTPUT):
	mkdir -p $@

$(OUTPUT)/images: | $(OUTPUT)
	node --enable-source-maps contrib/prepare-emoji.js
	cp contrib/wikimedia/* $@/

universe: $(_UNIVERSE).zen.html


_PARTS := 1800_1810 1810_1820 1820_1830 1830_1840 1840_1850 1850_1860 1860_1870 1870_1880 1880_1890 1890_1900 1900_1910 1910_1920 1920_1930 1930_1940 1940_1950 1950_1960 1960_1970 1970_1980 1980_1990 1990_2000 2000_2010 2010_2020 2020_2030
_PARTFILES := $(patsubst %, $(OUTPUT)/$(PREFIX)$(ORIGIN)_%, $(_PARTS))
_PARTS_GV := $(patsubst %, %.gv, $(_PARTFILES))
_PARTS_GV_SVG := $(patsubst %, %.gv.svg, $(_PARTFILES))
_PARTS_P1_DOT := $(patsubst %, %.p1.dot, $(_PARTFILES))
_PARTS_P2_DOT := $(patsubst %, %.p2.dot, $(_PARTFILES))
_PARTS_P3_DOT := $(patsubst %, %.p3.dot, $(_PARTFILES))
_PARTS_P4_DOT := $(patsubst %, %.p4.dot, $(_PARTFILES))
_PARTS_P999_DOT := $(patsubst %, %.p999.dot, $(_PARTFILES))
newuniverse: \
	$(OUTPUT)/images \
	$(_PARTS_GV) \
	$(_PARTS_GV_SVG) \
	$(_PARTS_P1_DOT) \
	$(_PARTS_P2_DOT)

%.zen.html %.system.html %.compat.html %.safe.html &: $(foreach _, $(_VARIANTS_PUBLISH), $(_UNIVERSE).$(_) $(_UNIVERSE).img.$(_)) $(_UNIVERSE).gv $(_UNIVERSE).img.gv
	node examples/build-site.js --output=$(OUTPUT) $(_UNIVERSE).gv
	$(_PRETTY_BIOME)

%.min.svg: %.svg
	scour -i $^ -o $@ $(_SCOUR_FLAGS)

%.gv.cairo.svg: %.gv
	dot -O -Tsvg:cairo $<

%.gv.svg: %.gv
	dot -O -Tsvg $<

%.gv.png: %.gv
	dot -O -Tpng $<

%.gv: lib node_modules | $(OUTPUT)
	node --enable-source-maps examples/universe.js \
		--origin=$(word 2, $(subst _, ,$@)) \
		--skip-before=$(word 3, $(subst _, ,$@)) \
		--skip-after=$(subst .gv,,$(word 4, $(subst _, ,$@))) \
		--output=$@ \
		$(_TIMELINES)

$(foreach _, $(_VARIANTS), $(_UNIVERSE).$(_)) &: $(_UNIVERSE).gv
	cd $(OUTPUT) && dot $(_DOT_FLAGS) $(_UNIVERSE_NAME).gv
	mv $(_UNIVERSE).gv.cairo.svg $(_UNIVERSE).cairo.svg
	mv $(_UNIVERSE).gv.svg $(_UNIVERSE).default.svg
	mv $(_UNIVERSE).gv.png $(_UNIVERSE).png
$(foreach _, $(_VARIANTS_IMG), $(_UNIVERSE).$(_)) &: $(_UNIVERSE).img.gv
	cd $(OUTPUT) && dot $(_DOT_FLAGS) $(_UNIVERSE_NAME).img.gv
	mv $(_UNIVERSE).img.gv.cairo.svg $(_UNIVERSE).img.cairo.svg
	mv $(_UNIVERSE).img.gv.svg $(_UNIVERSE).img.default.svg
	mv $(_UNIVERSE).img.gv.png $(_UNIVERSE).img.png

%.p1.dot: %.gv
	dot -v -Tdot -Gshowboxes=true -Gphase=1 $< -o $@

%.p2.dot: %.gv
	dot -v -Tdot -Gshowboxes=true -Gphase=2 $< -o $@

%.p3.dot: %.gv
	dot -v -Tdot -Gshowboxes=true -Gphase=3 $< -o $@

%.p4.dot: %.gv
	dot -v -Tdot -Gshowboxes=true -Gphase=4 $< -o $@

%.p999.dot: %.gv
	dot -v -Tdot -Gshowboxes=true -Gphase=999 $< -o $@

#$(_UNIVERSE).p2.gv: $(_UNIVERSE).p1.gv
#	node --enable-source-maps examples/gvpos.js \
#		--target=$(_UNIVERSE).p1.gv > $(_UNIVERSE).p2.gv

%.img.gv: output/images %.gv | output
	node --enable-source-maps examples/emojify.js \
		--assets=output/images \
		--target=$<

lib/timeline.js: node_modules | lib
	node build.js

docs: _site/index.html
_site/index.html: $(_UNIVERSE).zen.html | _site
	cp $(_UNIVERSE).zen.html _site/index.html

clean:
	rm --force --recursive _site lib
	find -iwholename "schemas/*.schema.json" -delete
purge: clean
	rm --force --recursive .venv node_modules

git-hook:
	echo "make pretty" > .git/hooks/pre-commit; chmod +x .git/hooks/pre-commit

pretty: node_modules
	$(_PRETTY_BIOME)
	npm pkg fix
	@for i in schemas/*.yml; do yq --prettyPrint --inplace "$$i"; done

lint: node_modules validate-data
	npm exec -- biome check .
	npm exec -- tsc --build --clean tsconfig.json
	npm exec -- tsc --build tsconfig.json

validate-schema: .venv
	. .venv/bin/activate; cd schemas; check-jsonschema --schemafile "https://json-schema.org/draft/2019-09/schema" *.yml

validate-data: .venv validate-schema
	. .venv/bin/activate; cd schemas; check-jsonschema --schemafile spec.schema.yml ../timelines/*.yml

test: node_modules lib
	NODE_OPTIONS=--enable-source-maps TZ=UTC npm exec -- c8 --reporter=html-spa mocha --reporter-option maxDiffSize=16000 lib/*.test.js

.venv: .venv/touchfile

.venv/touchfile: requirements.txt
	test -d .venv || virtualenv .venv
	. .venv/bin/activate; pip install -Ur requirements.txt
	touch .venv/touchfile

node_modules:
ifneq "$(CI)" ""
	sudo apt-get update; sudo apt-get install graphviz scour virtualenv
endif
	npm install