.PHONY: default build clean docs git-hook pretty lint test run

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
	NODE_OPTIONS=--enable-source-maps TZ=UTC npm exec -- c8 --reporter=html-spa mocha lib/*.test.js

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
	dot -Gnslimit=1 -Gnslimit1=1 -Gsplines=ortho -O -Tsvg timelines/.universe.gv
	@echo "SVG image rendered successfully."

render-hq: universe
	@echo "Rendering HQ SVG image with dot. This can take from several minutes up to hours! Please wait..."
	dot -v5 -O -Tsvg timelines/.universe.gv
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
_site: render-hq
	@mkdir _site 2>/dev/null || true
	@echo "Generating '_site/index.html'..."
	node build-site.js > _site/index.html
	@echo "'_site/index.html' generated successfully."
