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

run: node_modules
	npm exec -- vite serve

universe: lib output
	node examples/universe.js > timelines/.universe.gv
	dot -Tsvg:cairo timelines/.universe.gv > timelines/.universe.svg
	cp timelines/.universe.svg examples/universe.svg

node_modules:
	npm install

lib: node_modules
	npm exec -- tsc
output: node_modules
	@node build.js
_site:
	npm exec -- vite build

preview: clean
	npm exec -- vite preview
