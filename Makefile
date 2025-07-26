.PHONY: default build clean docs git-hook pretty lint test

ifneq "$(CI)" ""
	DEBUG := 1
endif

START ?= 1980
END ?= 2000
ORIGIN ?= 1983-12-15

_DECADES := $(foreach _, $(shell seq $(START) 10 $(END)), $(ORIGIN)_$(START)_$(_))
_SEGMENT := $(ORIGIN)_$(START)_$(END)

OUTPUT ?= output/$(_SEGMENT)
PREFIX ?= universe-

_UNIVERSE_NAME := $(PREFIX)$(_SEGMENT)
_UNIVERSE := $(OUTPUT)/$(_UNIVERSE_NAME)
_TIMELINES := $(wildcard timelines/* ~/timelines/*.yml)
_DECADES_REQUESTS := $(foreach _, $(_DECADES), output/$(PREFIX)$(_).request)

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

lib: node_modules
	npm exec -- tsc --build tsconfig.json

schema:
	@for i in schemas/*.yml; do yq --output-format=json eval '(.. | select(key == "$$ref" and type == "!!str")) |= sub(".schema.yml", ".schema.json")' "$$i" > "$${i%.yml}.json"; done

_site output $(OUTPUT):
	mkdir -p $@

output/images: output
	node --enable-source-maps contrib/prepare-emoji.js
	cp contrib/wikimedia/* output/images/

decades: output $(_DECADES_REQUESTS)
$(_DECADES_REQUESTS): output
	touch $@

universe: $(_UNIVERSE).zen.html

%.zen.html %.system.html %.compat.html %.safe.html &: $(foreach _, $(_VARIANTS_PUBLISH), $(_UNIVERSE).$(_) $(_UNIVERSE).img.$(_)) $(_UNIVERSE).gv $(_UNIVERSE).img.gv
	node examples/build-site.js --output=$(OUTPUT) $(_UNIVERSE).gv
	$(_PRETTY_BIOME)

%.min.svg: %.svg
	scour -i $^ -o $@ $(_SCOUR_FLAGS)

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

$(_UNIVERSE).gv: lib node_modules | $(OUTPUT)
	node --enable-source-maps examples/universe.js \
		--origin=$(ORIGIN) \
		--skip-before=$(START) \
		--skip-after=$(END) \
		--output=$(_UNIVERSE).gv \
		$(_TIMELINES)

$(_UNIVERSE).img.gv: output/images $(_UNIVERSE).gv | $(OUTPUT)
	node --enable-source-maps examples/emojify.js \
		--assets=output/images \
		--target=$(_UNIVERSE).gv

lib/timeline.js: node_modules | lib
	node build.js

docs: _site/index.html
_site/index.html: $(_UNIVERSE).zen.html | _site
	cp $(_UNIVERSE).zen.html _site/index.html
