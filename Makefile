.PHONY: default build clean docs git-hook pretty lint test

DEBUG != echo $$DEBUG
ifneq "$(CI)" ""
	DEBUG := 1
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
	npm exec -- tsc --noEmit

test: node_modules
	npm exec -- tsc
	NODE_OPTIONS=--enable-source-maps TZ=UTC npm exec -- c8 --reporter=html-spa mocha --reporter-option maxDiffSize=16000 lib/*.test.js

node_modules:
ifneq "$(CI)" ""
	sudo apt-get update; sudo apt-get install graphviz scour
endif
	npm install

lib: node_modules
	npm exec -- tsc --build

ifneq "$(CI)" ""
	START := 1980
	END != 2035
	ORIGIN != 1983-12-15
else
	START != echo $$START
	END != echo $$END
	ORIGIN != echo $$ORIGIN
endif

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

_TIMELINES := $(wildcard timelines/* ~/timelines/*.yml)

_SCOUR_FLAGS = --enable-viewboxing --enable-id-stripping --enable-comment-stripping --shorten-ids --indent=none
ifneq ($(DEBUG),)
	_SCOUR_FLAGS += --verbose
endif

%.min.svg: %.svg
	scour -i $^ -o $@ $(_SCOUR_FLAGS)

_DOT_FLAGS := -O -Tsvg -Tsvg:cairo
ifneq ($(DEBUG),)
	_DOT_FLAGS += -v5
endif

output/universe.gv.cairo.svg output/universe.gv.svg &: output/universe.gv
	dot $(_DOT_FLAGS) output/universe.gv

output/universe-$(START)-$(END).gv.cairo.svg output/universe-$(START)-$(END).gv.svg &: output/universe-$(START)-$(END).gv
	dot $(_DOT_FLAGS) output/universe-$(START)-$(END).gv

output/universe.gv: lib
	@mkdir output 2>/dev/null || true
	node --enable-source-maps examples/universe.js $(_FLAGS) $(_TIMELINES) > $@

output/universe-$(START)-$(END).gv: lib
	@mkdir output 2>/dev/null || true
	node --enable-source-maps examples/universe.js --skip-before=$(START) --skip-after=$(END) $(_TIMELINES) > $@

output: node_modules
	node build.js

_site: output/universe-$(START)-$(END).gv.cairo.min.svg output/universe-$(START)-$(END).gv.svg output/universe-$(START)-$(END).gv
	@mkdir _site 2>/dev/null || true
	node examples/build-site.js --output=_site output/universe-$(START)-$(END).gv

_site/index.html: _site
	cp _site/index.system.html _site/index.html
