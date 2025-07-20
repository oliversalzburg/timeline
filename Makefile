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
_DOT_FLAGS := -O -Tsvg -Tsvg:cairo
ifneq ($(DEBUG),)
	_DOT_FLAGS += -v5
endif


default: build docs

build: lib output

clean:
	rm --force --recursive _site lib output
purge: clean
	rm --force --recursive node_modules

docs: _site/index.html

git-hook:
	echo "make pretty" > .git/hooks/pre-commit; chmod +x .git/hooks/pre-commit

pretty: node_modules
	npm exec -- biome check --write --no-errors-on-unmatched
	npm pkg fix

lint: node_modules
	npm exec -- biome check .
	npm exec -- tsc --build --clean tsconfig.json
	npm exec -- tsc --build tsconfig.json

test: node_modules
	npm exec -- tsc
	NODE_OPTIONS=--enable-source-maps TZ=UTC npm exec -- c8 --reporter=html-spa mocha --reporter-option maxDiffSize=16000 lib/*.test.js

node_modules:
ifneq "$(CI)" ""
	sudo apt-get update; sudo apt-get install graphviz scour
endif
	npm install

lib: node_modules
	npm exec -- tsc --build tsconfig.json

%.min.svg: %.svg
	scour -i $^ -o $@ $(_SCOUR_FLAGS)

output/universe-$(_SEGMENT).cairo.svg output/universe-$(_SEGMENT).default.svg &: output/universe-$(_SEGMENT).gv
	dot $(_DOT_FLAGS) output/universe-$(_SEGMENT).gv
	mv output/universe-$(_SEGMENT).gv.cairo.svg output/universe-$(_SEGMENT).cairo.svg
	mv output/universe-$(_SEGMENT).gv.svg output/universe-$(_SEGMENT).default.svg

output/universe-$(_SEGMENT).gv: lib
	@mkdir output 2>/dev/null || true
	node --enable-source-maps examples/universe.js --origin=$(ORIGIN) --skip-before=$(START) --skip-after=$(END) $(_TIMELINES) > $@

output: node_modules
	node build.js

_site: output/universe-$(_SEGMENT).cairo.min.svg output/universe-$(_SEGMENT).default.svg output/universe-$(_SEGMENT).default.min.svg output/universe-$(_SEGMENT).gv
	@mkdir _site 2>/dev/null || true
	node examples/build-site.js --output=_site output/universe-$(_SEGMENT).gv

_site/index.html: _site
	cp _site/index.system.html _site/index.html
