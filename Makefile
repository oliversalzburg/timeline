.PHONY: default build clean docs git-hook pretty lint test

ifneq "$(CI)" ""
	DEBUG := 1
endif

START ?= 1980
END ?= 2035
ORIGIN ?= 1983-12-15

ifeq ($(START),)
	_START :=
else
	_START := --skip-before=$(START)
endif
ifeq ($(END),)
	_END :=
else
	_END := --skip-after=$(END)
endif
ifeq ($(ORIGIN),)
	_ORIGIN := --origin=1983-12-25
else
	_ORIGIN := --origin=$(ORIGIN)
endif
_FLAGS := $(_ORIGIN) $(_START) $(_END)
_SEGMENT := $(ORIGIN)_$(START)_$(END)

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

build: lib output

clean:
	rm --force --recursive _site lib output
	find -iwholename "schemas/*.schema.json" -delete
purge: clean
	rm --force --recursive .venv node_modules

docs: _site/index.html

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
	sudo apt-get update; sudo apt-get install graphviz scour
endif
	npm install

lib: node_modules
	npm exec -- tsc --build tsconfig.json

schema:
	@for i in schemas/*.yml; do yq --output-format=json eval '(.. | select(key == "$$ref" and type == "!!str")) |= sub(".schema.yml", ".schema.json")' "$$i" > "$${i%.yml}.json"; done

%.min.svg: %.svg
	scour -i $^ -o $@ $(_SCOUR_FLAGS)

$(foreach _, $(_VARIANTS), output/universe-$(_SEGMENT).$(_)) &: output/universe-$(_SEGMENT).gv
	dot $(_DOT_FLAGS) output/universe-$(_SEGMENT).gv
	mv output/universe-$(_SEGMENT).gv.cairo.svg output/universe-$(_SEGMENT).cairo.svg
	mv output/universe-$(_SEGMENT).gv.svg output/universe-$(_SEGMENT).default.svg
	mv output/universe-$(_SEGMENT).gv.png output/universe-$(_SEGMENT).png

output/universe-$(_SEGMENT).gv: lib
	@mkdir output 2>/dev/null || true
	node --enable-source-maps examples/universe.js --origin=$(ORIGIN) --skip-before=$(START) --skip-after=$(END) --output=output/universe-$(_SEGMENT).gv $(_TIMELINES)

output: node_modules
	node build.js

_site: $(foreach _, $(_VARIANTS_PUBLISH), output/universe-$(_SEGMENT).$(_)) output/universe-$(_SEGMENT).gv
	@mkdir _site 2>/dev/null || true
	node examples/build-site.js --output=_site output/universe-$(_SEGMENT).gv

_site/index.html: _site
	cp _site/index.system.html _site/index.html
