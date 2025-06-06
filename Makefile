.PHONY: default build clean docs git-hook pretty lint test run

default: build

build: output

clean:
	rm --force --recursive node_modules output tsconfig.tsbuildinfo

docs:
	@echo "No documentation included by default."

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
	NODE_OPTIONS=--enable-source-maps TZ=UTC npm exec -- c8 --reporter=html-spa mocha output/*.test.js

run: node_modules
	npm exec -- vite serve
run-main: output
	@node --enable-source-maps output/main.js

universe:
	rm -rf output
	$(MAKE) output
	node --enable-source-maps output/main.js
	dot -Tsvg:cairo timelines/.universe.gv > timelines/.universe.svg

node_modules:
	npm install

output: node_modules
	npm exec -- vite build
	@node build.js

preview: clean
	npm exec -- vite preview
