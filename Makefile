.PHONY: default build clean docs git-hook pretty lint test universe-preview render-smoke render-preview render-hq

default: build

build: lib output

clean:
	rm --force --recursive _site lib node_modules output tsconfig.tsbuildinfo

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

universe-preview: lib output
	node --enable-source-maps examples/universe.js --preview $(shell ls timelines/* ~/timelines/*.yml) > timelines/.universe.gv

universe: lib output
	node examples/universe.js $(shell ls timelines/* ~/timelines/*.yml) > timelines/.universe.gv

render-smoke: universe-preview
	@echo "Trying to render ANY visible SVG image with dot. This shouldn't take long..."
	dot -Gnslimit=0.1 -Gnslimit1=0.1 -Gsplines=none -O -Tsvg timelines/.universe.gv
	@echo "SVG image rendered successfully."

render-preview: universe-preview
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
	npm exec -- tsc
output: node_modules
	@node build.js
_site: render-preview
	@mkdir _site 2>/dev/null || true
	@echo "Generating '_site/index.html'..."
	node build-site.js timelines/.universe.gv.cairo.svg > _site/index.html
	@echo "Generating '_site/system.html'..."
	node build-site.js timelines/.universe.gv.svg > _site/system.html
	@echo "HTML documents generated successfully."
