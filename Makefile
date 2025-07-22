.PHONY: default build clean docs git-hook pretty lint test

ifneq "$(CI)" ""
	DEBUG := 1
endif

START ?= 1980
END ?= 2035
ORIGIN ?= 1983-12-15

_SEGMENT := $(ORIGIN)_$(START)_$(END)

OUTPUT ?= output/$(_SEGMENT)
PREFIX ?= universe-

_TIMELINES := $(wildcard timelines/* ~/timelines/*.yml)

_SCOUR_FLAGS = --enable-viewboxing --enable-id-stripping --enable-comment-stripping --shorten-ids --indent=none
ifneq ($(DEBUG),)
	_SCOUR_FLAGS += --verbose
endif

_VARIANTS := cairo.svg default.svg png
_VARIANTS_PUBLISH := cairo.svg cairo.min.svg default.svg default.min.svg png
_DOT_FLAGS := -O -Tpng -Tsvg -Tsvg:cairo
ifneq ($(DEBUG),)
	_DOT_FLAGS += -v5
endif


default: build docs

build: lib output/timeline.js

clean:
	rm --force --recursive _site lib output
	find -iwholename "schemas/*.schema.json" -delete
purge: clean
	rm --force --recursive .venv node_modules

git-hook:
	echo "make pretty" > .git/hooks/pre-commit; chmod +x .git/hooks/pre-commit

pretty: node_modules
	npm exec -- biome check --write --no-errors-on-unmatched
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

test: node_modules
	npm exec -- tsc
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

universe: $(OUTPUT)/$(PREFIX)$(_SEGMENT).zen.html

%.zen.html %.system.html %.compat.html %.safe.html &: $(foreach _, $(_VARIANTS_PUBLISH), $(OUTPUT)/$(PREFIX)$(_SEGMENT).$(_)) $(OUTPUT)/$(PREFIX)$(_SEGMENT).gv
	node examples/build-site.js --output=$(OUTPUT) $(OUTPUT)/$(PREFIX)$(_SEGMENT).gv
	$(MAKE) pretty

%.min.svg: %.svg
	scour -i $^ -o $@ $(_SCOUR_FLAGS)

$(foreach _, $(_VARIANTS), $(OUTPUT)/$(PREFIX)$(_SEGMENT).$(_)) &: $(OUTPUT)/$(PREFIX)$(_SEGMENT).gv
	dot $(_DOT_FLAGS) $(OUTPUT)/$(PREFIX)$(_SEGMENT).gv
	mv $(OUTPUT)/$(PREFIX)$(_SEGMENT).gv.cairo.svg $(OUTPUT)/$(PREFIX)$(_SEGMENT).cairo.svg
	mv $(OUTPUT)/$(PREFIX)$(_SEGMENT).gv.svg $(OUTPUT)/$(PREFIX)$(_SEGMENT).default.svg
	mv $(OUTPUT)/$(PREFIX)$(_SEGMENT).gv.png $(OUTPUT)/$(PREFIX)$(_SEGMENT).png

$(OUTPUT)/$(PREFIX)$(_SEGMENT).gv: lib node_modules $(OUTPUT)
	node --enable-source-maps examples/universe.js --origin=$(ORIGIN) --skip-before=$(START) --skip-after=$(END) --output=$(OUTPUT)/$(PREFIX)$(_SEGMENT).gv $(_TIMELINES)

output/timeline.js: node_modules output
	node build.js

docs: _site/index.html
_site/index.html: _site $(OUTPUT)/$(PREFIX)$(_SEGMENT).zen.html
	cp $(OUTPUT)/$(PREFIX)$(_SEGMENT).zen.html _site/index.html
