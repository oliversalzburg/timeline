.PHONY: default build clean docs git-hook pretty lint test coverage universe

_OUTPUT := output

_SOURCES := $(wildcard contrib/* examples/* source/*.ts source/*/*.ts)
_SOURCES_TS := $(wildcard source/*.ts source/*/*.ts)
_LIBS_JS := $(patsubst %.ts,%.js,$(_SOURCES_TS))
_LIBS_JS_MAP := $(patsubst %.ts,%.js.map,$(_SOURCES_TS))
_LIBS_D_TS := $(patsubst %.ts,%.d.ts,$(_SOURCES_TS))
_LIBS_D_TS_MAP := $(patsubst %.ts,%.d.ts.map,$(_SOURCES_TS))

DATA_ROOT := ~/timelines
TIMELINES := $(wildcard $(DATA_ROOT)/*.yml $(DATA_ROOT)/*/*.yml)
SEGMENTS := $(wildcard $(DATA_ROOT)/*.gvus $(DATA_ROOT)/*/*.gvus)

_SCOUR_FLAGS = --enable-viewboxing --enable-id-stripping --enable-comment-stripping --shorten-ids --indent=none
ifneq ($(DEBUG),)
	_SCOUR_FLAGS += --verbose
endif

DOT_FLAGS := -Gcenter=false -Gimagepath=$(_OUTPUT)/images -Gmargin=0 -Gpad=0
ifneq ($(DEBUG),)
	DOT_FLAGS += -v5
endif

ifneq ($(DEBUG),)
	PEDIGREE_FLAGS += --debug
	UNIVERSE_FLAGS += --debug
endif
ifneq ($(PRIVATE),)
	UNIVERSE_FLAGS += --private
endif


lib/tsconfig.source.tsbuildinfo $(_LIBS_D_TS) $(_LIBS_D_TS_MAP) $(_LIBS_JS) $(_LIBS_JS_MAP) : node_modules $(_SOURCES_TS)
	@echo "Building library..."
	@npm exec -- tsc --build tsconfig.json

_site lib $(_OUTPUT) :
	mkdir -p $@

$(_OUTPUT)/images : | $(_OUTPUT)
	@node --enable-source-maps contrib/prepare-emoji.js
	@cp contrib/wikimedia/* $@/
	@node --enable-source-maps examples/emojify.js --copy-only


%-demo.universe : %.yml lib/tsconfig.source.tsbuildinfo
	node --enable-source-maps examples/space-time-generator.js \
		--anonymize \
		--origin=$< \
		--root=/home/oliver/timelines \
		--target=$@
%.universe : %.yml lib/tsconfig.source.tsbuildinfo
	node --enable-source-maps examples/space-time-generator.js \
		--origin=$< \
		--root=/home/oliver/timelines \
		--target=$@

%-analytics.md : %.universe %-pedigree-light.svg
	node --enable-source-maps examples/pedigree.js \
		$(PEDIGREE_FLAGS) \
		--analytics \
		--format=report \
		--origin=$< \
		--target=$@ \
		--theme=light
%-demo.md : %-demo.universe %-demo-pedigree-light.svg
	node --enable-source-maps examples/pedigree.js \
		$(PEDIGREE_FLAGS) \
		--anonymize \
		--format=report \
		--origin=$< \
		--target=$@ \
		--theme=light
%.md : %.universe %-pedigree-light.svg
	node --enable-source-maps examples/pedigree.js \
		$(PEDIGREE_FLAGS) \
		--format=report \
		--origin=$< \
		--target=$@ \
		--theme=light

%-pedigree-light.gv : %.universe
	node --enable-source-maps examples/pedigree.js \
		$(PEDIGREE_FLAGS) \
		--format=simple \
		--origin=$< \
		--target=$@ \
		--theme=light
# We intentionally don't pass --anonymize here, because we're already operating
# on the anonymized -demo.universe.
%-demo-pedigree-light.gv : %-demo.universe
	node --enable-source-maps examples/pedigree.js \
		$(PEDIGREE_FLAGS) \
		--format=simple \
		--origin=$< \
		--target=$@ \
		--theme=light
%-universe.info : %.universe
	node --enable-source-maps examples/universe.js \
		$(UNIVERSE_FLAGS) \
		--origin=$< \
		--segment=300 \
		--target=$(patsubst %-universe.info,%-universe.gvus,$@)
# We intentionally don't pass --anonymize here, because we're already operating
# on the anonymized -demo.universe.
%-demo-universe.info : %-demo.universe
	node --enable-source-maps examples/universe.js \
		$(UNIVERSE_FLAGS) \
		--origin=$< \
		--segment=300 \
		--target=$(patsubst %-demo-universe.info,%-demo-universe.gvus,$@)
%-universe.svg : %-universe.info $(_OUTPUT)/images
	contrib/make.sh $(patsubst %-universe.svg,%,$@)
#%-demo-universe.svg : %-demo-universe.info $(_OUTPUT)/images
#	contrib/make.sh $(patsubst %-universe.svg,%,$@)
%-universe.html : %-universe.info %-universe.svg
	node --enable-source-maps examples/build-site.js \
		--format=zen \
		--target=$@
%-demo-universe.html : %-demo-universe.info %-demo-universe.svg
	node --enable-source-maps examples/build-site.js \
		--format=zen \
		--target=$@

%.dot : %.gv
	dot -Tcanon -o $@ $<
	@date +"%FT%T%z Normalized GraphViz document '$@'."
%.dotus : %.gvus
	dot -Tcanon -o $@ $<
	@date +"%FT%T%z Normalized GraphViz document '$@'."

# Embed (emoji) prefixes as <IMG> elements in the label.
# At time of implementation, this output did not render well
# with cairo.
%-img.dot : %.dot $(_OUTPUT)/images | $(_OUTPUT)
	node --enable-source-maps examples/emojify.js \
		--assets=$(_OUTPUT)/images \
		--target=$<
	@date +"%FT%T%z Embedded prefixes into '$@'."
%.idotus : %.dotus $(_OUTPUT)/images | $(_OUTPUT)
	node --enable-source-maps examples/emojify.js \
		--assets=$(_OUTPUT)/images \
		--target=$<
	@date +"%FT%T%z Embedded prefixes into '$@'."

%.svg : %.dot
	@dot $(DOT_FLAGS) -Gpad=0 -Tsvg:cairo -o $@ $<
%.isvgus : %.idotus
	@dot $(DOT_FLAGS) -Gpad=0 -Tsvg -o $@ $<

%-analytics.pdf : %-analytics.md %-pedigree-light.svg
	@cd $(dir $@); pandoc \
		--from markdown \
		--to pdf \
		--pdf-engine lualatex \
		--output $(notdir $@) \
		$(notdir $<)
%-demo.pdf : %-demo.md %-demo-pedigree-light.svg
	cd $(dir $@); pandoc \
		--from markdown \
		--to pdf \
		--pdf-engine lualatex \
		--output $(notdir $@) \
		$(notdir $<)
%.pdf : %.md %-pedigree-light.svg
	cd $(dir $@); pandoc \
		--from markdown \
		--to pdf \
		--pdf-engine lualatex \
		--output $(notdir $@) \
		$(notdir $<)

# Compress an SVG by applying lossy XML transformations.
%.min.svg: %.svg
	@scour $(_SCOUR_FLAGS) -i $< -o $@
	@date +"%FT%T%z Generated minified '$@'."


# Not actually referenced in the implementation. Contains the library code
# for usage somewhere else.
lib/timeline.js: node_modules build.js | lib
	@node build.js

# Clean up all build artifacts.
clean:
	@rm --force --recursive _site lib $(_OUTPUT)/*
	@find -iname "callgrind.out.*" -delete
	@find -iwholename "schemas/*.schema.json" -delete
# Additionally delete all stored dependencies.
purge: clean
	rm --force --recursive .venv node_modules

# Register a git hook to run "make pretty" before each commit.
git-hook:
	echo "make pretty" > .git/hooks/pre-commit; chmod +x .git/hooks/pre-commit

# Normalizes the style of as many documents in the repository as possible.
pretty: node_modules
	npm exec -- biome check --unsafe --write
	npm pkg fix
	@for i in schemas/*.yml; do yq --prettyPrint --inplace "$$i"; done

# Ensure all source documents are valid, as far as can be determined statically.
lint: node_modules validate-data
	npm exec -- biome check .
	npm exec -- tsc --build --clean tsconfig.json
	npm exec -- tsc --build tsconfig.json

# Validate all schemas to be valid JSON schema documents.
validate-schema: .venv
	. .venv/bin/activate; cd schemas; \
	check-jsonschema \
		--schemafile "https://json-schema.org/draft/2019-09/schema" \
		*.yml

# Validate all data to be valid timeline documents.
validate-data: .venv validate-schema
	. .venv/bin/activate; cd schemas; \
	check-jsonschema \
		--schemafile spec.schema.yml \
		../timelines/*.yml

# Run available software tests.
test: node_modules lib
	TZ=UTC node --enable-source-maps --inspect \
		node_modules/.bin/mocha --reporter-option maxDiffSize=16000 \
		lib/*.test.js
coverage: node_modules lib
	NODE_OPTIONS=--enable-source-maps TZ=UTC npm exec -- \
		c8 --reporter=html-spa \
		mocha --reporter-option maxDiffSize=16000 \
		lib/*.test.js

# Python dependency handling
.venv: .venv/touchfile
.venv/touchfile: requirements.txt
	test -d .venv || virtualenv .venv
	. .venv/bin/activate; pip install -Ur requirements.txt
	touch .venv/touchfile

# Nodejs dependency handling
node_modules:
# This check is a hack for GitHub CI environments. The graphviz in the APT repo
# may or may not work as expected. The lab environment uses a locally built
# version of GraphViz.
ifneq "$(CI)" ""
	sudo apt-get update; sudo apt-get install graphviz scour virtualenv
endif
	npm install

schema:
	@for i in schemas/*.yml; do \
		yq --output-format=json \
		eval '(.. | select(key == "$$ref" and type == "!!str")) |= sub(".schema.yml", ".schema.json")' \
		"$$i" > "$${i%.yml}.json"; \
		done
