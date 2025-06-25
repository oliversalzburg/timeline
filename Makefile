.PHONY: default build clean docs git-hook pretty lint test run

default: build

build: lib output _site

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

universe: lib output
	node examples/universe.js > timelines/.universe.gv
	@echo "Rendering SVG image. This can take several minutes! Please wait..."
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
_site: universe
	@mkdir _site 2>/dev/null || true
	@echo "Generating '_site/index.html'..."
	node build-site.js > _site/index.html
	@echo "'_site/index.html' generated successfully."
