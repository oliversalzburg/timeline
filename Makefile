-include build.config.mk

OUTPUT ?= output
OUTPUT_BUILD := $(OUTPUT)/build

#_SOURCES := $(wildcard contrib/* examples/* source/*.ts source/*/*.ts)
_SOURCES_TS := $(wildcard source/*.ts) $(wildcard source/*/*.ts)
_LIBS_JS := $(patsubst source/%,lib/%,$(patsubst %.ts,%.js,$(_SOURCES_TS)))
_LIBS_JS_MAP := $(patsubst source/%,lib/%,$(patsubst %.ts,%.js.map,$(_SOURCES_TS)))
_LIBS_D_TS := $(patsubst source/%,lib/%,$(patsubst %.ts,%.d.ts,$(_SOURCES_TS)))
_LIBS_D_TS_MAP := $(patsubst source/%,lib/%,$(patsubst %.ts,%.d.ts.map,$(_SOURCES_TS)))

_IMAGES := $(wildcard contrib/openmoji-svg-color/*.svg) $(wildcard contrib/wikimedia/*.svg)
IMAGES := $(addprefix $(OUTPUT_BUILD)/,$(notdir $(_IMAGES)))

DATA_ROOT ?= $(shell realpath ~/timelines)
ifneq ("$(wildcard $(DATA_ROOT))","")
	TIMELINES ?= $(shell find $(DATA_ROOT) -iname "*.yml")
else
	DATA_ROOT = $(abspath timelines)
	TIMELINES = $(shell find $(DATA_ROOT) -iname "*.yml")
endif

SEGMENTS := $(wildcard $(OUTPUT_BUILD)/*.gvus)
SEGMENTS_ISVG := $(patsubst %.gvus,%.isvgus,$(SEGMENTS))

_SCOUR_FLAGS = --enable-viewboxing --enable-id-stripping --enable-comment-stripping --shorten-ids --indent=none
ifneq ($(DEBUG),)
	_SCOUR_FLAGS += --verbose
endif

DOT_FLAGS := -Gcenter=false -Gimagepath=$(OUTPUT_BUILD) -Gmargin=0 -Gpad=0
ifneq ($(DEBUG_DOT),)
	DOT_FLAGS += -v5
endif

ifneq ($(DEBUG)$(DEBUG_RENDERER),)
	PEDIGREE_FLAGS += --debug
	UNIVERSE_FLAGS += --debug
endif
ifneq ($(MAX_IDENTITY_DISTANCE),)
	UNIVERSE_FLAGS += --max-identity-distance=$(MAX_IDENTITY_DISTANCE)
endif
ifneq ($(MIN_IDENTITY_BORN),)
	UNIVERSE_FLAGS += --min-identity-born=$(MIN_IDENTITY_BORN)
endif
ifneq ($(SKIP_BEFORE),)
	UNIVERSE_FLAGS += --skip-before=$(SKIP_BEFORE)
endif
ifneq ($(SKIP_AFTER),)
	UNIVERSE_FLAGS += --skip-after=$(SKIP_AFTER)
endif
ifneq ($(SEGMENT),)
	UNIVERSE_FLAGS += --segment=$(SEGMENT)
else
	UNIVERSE_FLAGS += --segment=300
endif

.PHONY: default build clean docs git-hook pretty lint test coverage universe

default: \
	$(OUTPUT)/pedigree.pdf \
	$(OUTPUT)/pedigree-analytics.pdf \
	$(OUTPUT)/pedigree-public.pdf \
	$(OUTPUT)/universe.html

lib/%.d.ts : lib/%.js
lib/%.d.ts.map : lib/%.d.ts
lib/%.js.map : lib/%.js
lib/%.js &: source/%.ts
	+@make lib/tsconfig.source.tsbuildinfo
lib/tsconfig.source.tsbuildinfo : node_modules/.package-lock.json $(_SOURCES_TS)
	@npm exec -- tsc --build tsconfig.json
	@touch lib/tsconfig.source.tsbuildinfo
	@date +"%FT%T%z Library code rebuilt."

$(IMAGES) &: contrib/prepare-emoji.js
	@mkdir -p $(OUTPUT_BUILD)
	@node --enable-source-maps contrib/prepare-emoji.js \
		"--target=$(OUTPUT_BUILD)"
	@cp contrib/wikimedia/* "$(OUTPUT_BUILD)"
	@date +"%FT%T%z Vector image data prepared."

%/universe-public.yml : $(TIMELINES) lib/tsconfig.source.tsbuildinfo examples/space-time-generator.js
	@node --enable-source-maps examples/space-time-generator.js \
		--anonymize \
		"--origin=$(ORIGIN)" \
		"--root=$(DATA_ROOT)" \
		"--target=$@"
	@date +"%FT%T%z PUBLIC Universe generated '$@'."
%/universe.yml : $(TIMELINES) lib/tsconfig.source.tsbuildinfo examples/space-time-generator.js
	@mkdir -p $(OUTPUT_BUILD)
	@node --enable-source-maps examples/space-time-generator.js \
		"--origin=$(ORIGIN)" \
		"--root=$(DATA_ROOT)" \
		"--target=$@"
	@date +"%FT%T%z Universe generated '$@'."

%/pedigree-public.md : %/universe-public.yml %/pedigree-public-light.svg examples/pedigree.js
	@node --enable-source-maps examples/pedigree.js \
		$(PEDIGREE_FLAGS) \
		--anonymize \
		--format=report \
		"--origin=$<" \
		"--target=$@" \
		--theme=light
	@date +"%FT%T%z PUBLIC Report generated '$@'."
%/pedigree.md : %/universe.yml %/pedigree-light.svg examples/pedigree.js
	@node --enable-source-maps examples/pedigree.js \
		$(PEDIGREE_FLAGS) \
		--format=report \
		"--origin=$<" \
		"--target=$@" \
		--theme=light
	@date +"%FT%T%z Report generated '$@'."
%/pedigree-analytics.md : %/universe.yml %/pedigree-light.svg examples/pedigree.js
	@node --enable-source-maps examples/pedigree.js \
		$(PEDIGREE_FLAGS) \
		--analytics \
		--format=report \
		"--origin=$<" \
		"--target=$@" \
		--theme=light
	@date +"%FT%T%z ANALYTICS Report generated '$@'."

%/pedigree-light.gv : %/universe.yml examples/pedigree.js
	@node --enable-source-maps examples/pedigree.js \
		$(PEDIGREE_FLAGS) \
		--format=simple \
		"--origin=$<" \
		"--target=$@" \
		--theme=light
	@date +"%FT%T%z Pedigree chart generated '$@'."
# We intentionally don't pass --anonymize here, because we're already operating
# on the anonymized universe.
%/pedigree-public-light.gv : %/universe-public.yml examples/pedigree.js
	@node --enable-source-maps examples/pedigree.js \
		$(PEDIGREE_FLAGS) \
		--format=simple \
		"--origin=$<" \
		"--target=$@" \
		--theme=light
	@date +"%FT%T%z PUBLIC Pedigree chart generated '$@'."
%/universe.info %/universe.meta &: %/universe.yml examples/universe.js
	@node --enable-source-maps examples/universe.js \
		$(UNIVERSE_FLAGS) \
		"--origin=$<" \
		"--target=$(patsubst %/universe.info,%/universe.gvus,$@)"
	@date +"%FT%T%z Universe (Meta-)Information generated '$@'."
# We intentionally don't pass --anonymize here, because we're already operating
# on the anonymized -demo.universe.
%/universe-public.info : %/universe-public.yml examples/universe.js
	@node --enable-source-maps examples/universe.js \
		$(UNIVERSE_FLAGS) \
		"--origin=$<" \
		"--target=$(patsubst %/universe-public.info,%/universe-public.gvus,$@)"
	@date +"%FT%T%z DEMO Universe (Meta-)Information generated '$@'."
%/universe.svg : $(SEGMENTS_ISVG)
	node --enable-source-maps contrib/svgcat.js \
		"--target=$@.loose" $(SEGMENTS_ISVG)
	node --enable-source-maps contrib/svgnest.js \
		"--assets=$(OUTPUT_BUILD)" \
		"--target=$@.loose" > $@
	@date +"%FT%T%z Universe SVG generated '$@'."
$(OUTPUT)/universe.html : $(OUTPUT_BUILD)/universe.info $(wildcard contrib/index.template.*) contrib/build-site.js
	+@make $(OUTPUT_BUILD)/universe.svg
	@node --enable-source-maps contrib/build-site.js \
		"--build=$(OUTPUT_BUILD)" \
		--format=zen \
		--target=$@
	@date +"%FT%T%z Universe HTML generated '$@'."
	@cp contrib/favicon.ico $(dir $@)
	@date +"%FT%T%z Synchronizing media..."
	@rsync --archive $(DATA_ROOT)/media $(dir $@)
	@date +"%FT%T%z Media synchronized. Golden image ready at '$(dir $@)'."
%-demo-universe.html : %-demo-universe.info %-demo-universe.svg $(wildcard contrib/index.template.*) contrib/build-site.js
	@node --enable-source-maps contrib/build-site.js \
		--format=zen \
		--target=$@
	@date +"%FT%T%z DEMO Universe HTML generated '$@'."

%.dot : %.gv
	@dot -Tcanon -o $@ $<
	@date +"%FT%T%z Normalized GraphViz DOT document '$@'."
%.dotus : %.gvus
	@dot -Tcanon -o $@ $<
	@date +"%FT%T%z Normalized GraphViz DOTus document '$@'."

# Embed (emoji) prefixes as <IMG> elements in the label.
# At time of implementation, this output did not render well
# with cairo.
%.idotus : %.dotus $(IMAGES) contrib/emojify.js
	@node --enable-source-maps contrib/emojify.js \
		"--assets=$(OUTPUT_BUILD)" \
		"--target=$<"
	@date +"%FT%T%z Generated embedded iDOTus fragment '$@'."
%.igvus : %.gvus $(IMAGES) contrib/emojify.js
	@node --enable-source-maps contrib/emojify.js \
		"--assets=$(OUTPUT_BUILD)" \
		"--target=$<"
	@date +"%FT%T%z Generated embedded iGVus fragment '$@'."

%.svg : %.dot
	@dot $(DOT_FLAGS) -Tsvg:cairo -o $@ $<
	@date +"%FT%T%z Rendered DOT graph SVG (Cairo) image '$@'."
%.isvgus : %.idotus
	@dot $(DOT_FLAGS) -Tsvg -o $@ $<
	@date +"%FT%T%z Rendered DOT graph iSVGus image '$@'."
%.isvgus : %.igvus
	@dot $(DOT_FLAGS) -Tsvg -o $@ $<
	@date +"%FT%T%z Rendered DOT graph iSVGus image '$@'."

$(OUTPUT)/pedigree-public.pdf : $(OUTPUT_BUILD)/pedigree-public.md $(OUTPUT_BUILD)/pedigree-public-light.svg
	@cd $(OUTPUT_BUILD); pandoc \
		--from markdown \
		--to pdf \
		--pdf-engine lualatex \
		"--output=$@" \
		$(notdir $<)
	@date +"%FT%T%z Generated PUBLIC pedigree chart '$@'."
$(OUTPUT)/pedigree.pdf : $(OUTPUT_BUILD)/pedigree.md $(OUTPUT_BUILD)/pedigree-light.svg
	@cd $(OUTPUT_BUILD); pandoc \
		--from markdown \
		--to pdf \
		--pdf-engine lualatex \
		"--output=$@" \
		$(notdir $<)
	@date +"%FT%T%z Generated pedigree chart '$@'."
$(OUTPUT)/pedigree-analytics.pdf : $(OUTPUT_BUILD)/pedigree-analytics.md $(OUTPUT_BUILD)/pedigree-light.svg
	@cd $(OUTPUT_BUILD); pandoc \
		--from markdown \
		--to pdf \
		--pdf-engine lualatex \
		"--output=$@" \
		$(notdir $<)
	@date +"%FT%T%z Generated ANALYTICS pedigree chart '$@'."

# Compress an SVG by applying lossy XML transformations.
%.min.svg: %.svg
	@scour $(_SCOUR_FLAGS) -i $< -o $@
	@date +"%FT%T%z Generated minified '$@'."


# Not actually referenced in the implementation. Contains the library code
# for usage somewhere else.
lib/timeline.js: node_modules/.package-lock.json build.js | lib
	@node build.js

# Clean up all build artifacts.
clean:
	@rm --force --recursive _site coverage lib $(OUTPUT) output
	@find -iname "callgrind.out.*" -delete
	@find -iwholename "schemas/*.schema.json" -delete
	@date +"%FT%T%z Cleaned."
# Additionally delete all stored dependencies.
purge: clean
	@rm --force --recursive .venv node_modules
	@date +"%FT%T%z Purged."

# Register a git hook to run "make pretty" before each commit.
git-hook:
	echo "make pretty" > .git/hooks/pre-commit; chmod +x .git/hooks/pre-commit

# Normalizes the style of as many documents in the repository as possible.
pretty: node_modules/.package-lock.json
	@npm exec -- biome check --unsafe --write
	@npm pkg fix
	@for i in schemas/*.yml; do yq --prettyPrint --inplace "$$i"; done

# Ensure all source documents are valid, as far as can be determined statically.
lint: node_modules/.package-lock.json validate-data
	@npm exec -- biome check .
	@npm exec -- tsc --build --clean tsconfig.json
	@npm exec -- tsc --build tsconfig.json

# Validate all schemas to be valid JSON schema documents.
validate-schema: .venv
	. .venv/bin/activate; cd schemas; \
	check-jsonschema \
		--schemafile "https://json-schema.org/draft/2019-09/schema" \
		*.yml

# Validate all data to be valid timeline documents.
validate-data: .venv validate-schema lib/tsconfig.source.tsbuildinfo
	. .venv/bin/activate; cd schemas; \
	check-jsonschema \
		--schemafile spec.schema.yml \
		$(TIMELINES)
	node --enable-source-maps contrib/timelinelint.js \
		"--root=$(DATA_ROOT)" \
		$(TIMELINES)

# Run available software tests.
test: lib/tsconfig.source.tsbuildinfo
	TZ=UTC node --enable-source-maps --inspect \
		node_modules/.bin/mocha --reporter-option maxDiffSize=16000 \
		lib/*.test.js
coverage: lib/tsconfig.source.tsbuildinfo
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
node_modules/.package-lock.json:
# This check is a hack for GitHub CI environments. The graphviz in the APT repo
# may or may not work as expected. The lab environment uses a locally built
# version of GraphViz.
ifneq "$(CI)" ""
	sudo apt-get update; sudo apt-get install graphviz scour virtualenv
endif
	@npm install

schema:
	@for i in schemas/*.yml; do \
		yq --output-format=json \
		eval '(.. | select(key == "$$ref" and type == "!!str")) |= sub(".schema.yml", ".schema.json")' \
		"$$i" > "$${i%.yml}.json"; \
		done

serve: node_modules/.package-lock.json
	npx http-server $(OUTPUT) --cors
