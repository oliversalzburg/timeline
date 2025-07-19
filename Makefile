.PHONY: default build clean docs git-hook pretty lint test render-smoke render-hq

default: | clean build

build: lib output

clean:
	rm --force --recursive _site lib output
purge: clean
	rm --force --recursive node_modules

docs: _site

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

START != echo $$START
END != echo $$END
ORIGIN != echo $$ORIGIN
ifeq ($(START),)
	_START ::= --skip-before=1999
else
	_START ::= --skip-before=${START}
endif
ifeq ($(END),)
	_END =
else
	_END ::= --skip-after=${END}
endif
ifeq ($(ORIGIN),)
	_ORIGIN ::= --origin=1983-12-25
else
	_ORIGIN ::= --origin=${ORIGIN}
endif
FLAGS=--preview ${_ORIGIN} ${_START} ${_END}

universe-preview: lib output
	node --enable-source-maps examples/universe.js ${FLAGS} $(shell ls timelines/* ~/timelines/*.yml) > timelines/.universe.gv

universe: lib output
	node examples/universe.js $(shell ls timelines/* ~/timelines/*.yml) > timelines/.universe.gv

render-smoke: universe-preview
	@echo "Trying to render ANY visible SVG image with dot. This shouldn't take long..."
	dot -Gnslimit=0.1 -Gnslimit1=0.1 -Gsplines=none -O -Tsvg timelines/.universe.gv
	@echo "SVG image rendered successfully."

timelines/.universe.gv: universe-preview
render-preview: timelines/.universe.gv
	@echo "Rendering preview SVG image with dot. This can take several minutes! Please wait..."
#	dot -Tdot timelines/.universe.gv > timelines/.universe.pre.gv
	dot -O -Tsvg -Tsvg:cairo timelines/.universe.gv
	@echo "SVG image rendered successfully."

render-hq: universe
	@echo "Rendering HQ SVG image with dot. This can take from several hours up to days! You are not supposed to run this on your local machine! Please wait..."
	dot -v5 -O -Tsvg:cairo timelines/.universe.gv
	@echo "SVG image rendered successfully."


node_modules:
ifneq "$(CI)" ""
	sudo apt-get update; sudo apt-get install graphviz
endif
	npm install

lib: node_modules
	npm exec -- tsc --build

output: node_modules
	@echo "Building timeline.js bundle..."
	node build.js
	@echo "Building timeline.js bundle complete."

timelines/.universe.gv.cairo.svg: render-preview
timelines/.universe.gv.svg: render-preview
_site: timelines/.universe.gv.cairo.svg timelines/.universe.gv.svg
	@mkdir _site 2>/dev/null || true
	@echo "Generating '_site/index.html'..."
	node build-site.js timelines/.universe.gv.cairo.svg > _site/index.html
	@echo "Generating '_site/system.html'..."
	node build-site.js timelines/.universe.gv.svg > _site/system.html
	@echo "HTML documents generated successfully."


graphs:
	mkdir graphs
graphs/%.gv: graphs lib
	node --enable-source-maps examples/universe.js --preview --skip-before=$*-01-01 --skip-after=$*-12-31 $(shell ls timelines/* ~/timelines/*.yml) > graphs/$*.gv
.PHONY: 1930-2030
1930-2030:
	$(MAKE) $(shell seq --format='graphs/%0g.gv' 1930 2030)
