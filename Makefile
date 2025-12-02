OUTPUT := output

#_SOURCES := $(wildcard contrib/* examples/* source/*.ts source/*/*.ts)
_SOURCES_TS := $(wildcard source/*.ts source/*/*.ts)
_LIBS_JS := $(patsubst %.ts,%.js,$(_SOURCES_TS))
_LIBS_JS_MAP := $(patsubst %.ts,%.js.map,$(_SOURCES_TS))
_LIBS_D_TS := $(patsubst %.ts,%.d.ts,$(_SOURCES_TS))
_LIBS_D_TS_MAP := $(patsubst %.ts,%.d.ts.map,$(_SOURCES_TS))

_IMAGES := $(wildcard contrib/openmoji-svg-color/*.svg) $(wildcard contrib/wikimedia/*.svg)
IMAGES := $(addprefix $(OUTPUT)/,$(notdir $(_IMAGES)))

DATA_ROOT ?= $(shell realpath ~/timelines)
ifneq ("$(wildcard $(DATA_ROOT))","")
	TIMELINES ?= $(shell find $(DATA_ROOT) -iname "*.yml")
else
	DATA_ROOT = $(abspath timelines)
	TIMELINES = $(shell find $(DATA_ROOT) -iname "*.yml")
endif

SEGMENTS := $(wildcard $(DATA_ROOT)/*.gvus $(DATA_ROOT)/*/*.gvus)

_SCOUR_FLAGS = --enable-viewboxing --enable-id-stripping --enable-comment-stripping --shorten-ids --indent=none
ifneq ($(DEBUG),)
	_SCOUR_FLAGS += --verbose
endif

DOT_FLAGS := -Gcenter=false -Gimagepath=$(OUTPUT) -Gmargin=0 -Gpad=0
ifneq ($(DEBUG_DOT),)
	DOT_FLAGS += -v5
endif

ifneq ($(DEBUG),)
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
.INTERMEDIATE: $(IMAGES)
#.PRECIOUS: %.dotus %.idotus %.isvgus

lib/tsconfig.source.tsbuildinfo $(_LIBS_D_TS) $(_LIBS_D_TS_MAP) $(_LIBS_JS) $(_LIBS_JS_MAP) : node_modules/.package-lock.json $(_SOURCES_TS)
	@npm exec -- tsc --build tsconfig.json
	@date +"%FT%T%z Library code rebuilt."

$(IMAGES) &: contrib/prepare-emoji.js examples/emojify.js
	@mkdir -p $(OUTPUT)
	@node --enable-source-maps contrib/prepare-emoji.js
	@cp contrib/wikimedia/* $(OUTPUT)/
	@node --enable-source-maps examples/emojify.js \
		--copy-only \
		--target=$(OUTPUT)
	@date +"%FT%T%z Vector image data prepared."

%-demo.universe : %.yml $(TIMELINES) lib/tsconfig.source.tsbuildinfo $(_SOURCES_TS) examples/space-time-generator.js
	@node --enable-source-maps examples/space-time-generator.js \
		--anonymize \
		--origin=$< \
		--root=$(DATA_ROOT) \
		--target=$@
	@date +"%FT%T%z DEMO Universe generated '$@'."
%.universe : %.yml $(TIMELINES) lib/tsconfig.source.tsbuildinfo $(_SOURCES_TS) examples/space-time-generator.js
	@node --enable-source-maps examples/space-time-generator.js \
		--origin=$< \
		--root=$(DATA_ROOT) \
		--target=$@
	@date +"%FT%T%z Universe generated '$@'."

%-analytics.md : %.universe %-pedigree-light.svg examples/pedigree.js
	@node --enable-source-maps examples/pedigree.js \
		$(PEDIGREE_FLAGS) \
		--analytics \
		--format=report \
		--origin=$< \
		--target=$@ \
		--theme=light
	@date +"%FT%T%z Analytics exported '$@'."
%-demo.md : %-demo.universe %-demo-pedigree-light.svg examples/pedigree.js
	@node --enable-source-maps examples/pedigree.js \
		$(PEDIGREE_FLAGS) \
		--anonymize \
		--format=report \
		--origin=$< \
		--target=$@ \
		--theme=light
	@date +"%FT%T%z DEMO Analytics exported '$@'."
%.md : %.universe %-pedigree-light.svg examples/pedigree.js
	@node --enable-source-maps examples/pedigree.js \
		$(PEDIGREE_FLAGS) \
		--format=report \
		--origin=$< \
		--target=$@ \
		--theme=light
	@date +"%FT%T%z Report generated '$@'."

%-pedigree-light.gv : %.universe examples/pedigree.js
	@node --enable-source-maps examples/pedigree.js \
		$(PEDIGREE_FLAGS) \
		--format=simple \
		--origin=$< \
		--target=$@ \
		--theme=light
	@date +"%FT%T%z Pedigree chart generated '$@'."
# We intentionally don't pass --anonymize here, because we're already operating
# on the anonymized -demo.universe.
%-demo-pedigree-light.gv : %-demo.universe examples/pedigree.js
	@node --enable-source-maps examples/pedigree.js \
		$(PEDIGREE_FLAGS) \
		--format=simple \
		--origin=$< \
		--target=$@ \
		--theme=light
	@date +"%FT%T%z DEMO Pedigree chart generated '$@'."
%-universe.info %-universe.meta &: %.universe examples/universe.js
	@node --enable-source-maps examples/universe.js \
		$(UNIVERSE_FLAGS) \
		--origin=$< \
		--segment=300 \
		--target=$(patsubst %-universe.info,%-universe.gvus,$@)
	@date +"%FT%T%z Universe (Meta-)Information generated '$@'."
# We intentionally don't pass --anonymize here, because we're already operating
# on the anonymized -demo.universe.
%-demo-universe.info : %-demo.universe examples/universe.js
	@node --enable-source-maps examples/universe.js \
		$(UNIVERSE_FLAGS) \
		--origin=$< \
		--segment=300 \
		--target=$(patsubst %-demo-universe.info,%-demo-universe.gvus,$@)
	@date +"%FT%T%z DEMO Universe (Meta-)Information generated '$@'."
%-universe.svg : %-universe.info $(IMAGES) contrib/make.sh
	+@contrib/make.sh $(patsubst %-universe.svg,%,$@)
	@date +"%FT%T%z Universe SVG generated '$@'."
%-universe.html : %-universe.info %-universe.svg $(wildcard examples/index.template.*) examples/build-site.js
	@node --enable-source-maps examples/build-site.js \
		--format=zen \
		--target=$@
	@date +"%FT%T%z Universe HTML generated '$@'."
	@cp $@ output/universe.html
	@date +"%FT%T%z Synchronizing media..."
	@rsync --archive $(DATA_ROOT)/media output/
	@date +"%FT%T%z Golden image ready at 'output/universe.html'."
%-demo-universe.html : %-demo-universe.info %-demo-universe.svg $(wildcard examples/index.template.*) examples/build-site.js
	@node --enable-source-maps examples/build-site.js \
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
%.idotus : %.dotus $(IMAGES)
	@node --enable-source-maps examples/emojify.js \
		--assets=$(OUTPUT) \
		--target=$<
	@date +"%FT%T%z Generated embedded iDOTus fragment '$@'."

%.svg : %.dot
	@dot $(DOT_FLAGS) -Gpad=0 -Tsvg:cairo -o $@ $<
	@date +"%FT%T%z Rendered DOT graph SVG (Cairo) image '$@'."
%.isvgus : %.idotus
	@dot $(DOT_FLAGS) -Gpad=0 -Tsvg -o $@ $<
	@date +"%FT%T%z Rendered DOT graph iSVGus image '$@'."

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
lib/timeline.js: node_modules/.package-lock.json build.js | lib
	@node build.js

# Clean up all build artifacts.
clean:
	@rm --force --recursive _site coverage lib $(OUTPUT)
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
	node --enable-source-maps examples/timelinelint.js \
		"--root=$(DATA_ROOT)" \
		$(TIMELINES)

# Run available software tests.
test: node_modules/.package-lock.json lib
	TZ=UTC node --enable-source-maps --inspect \
		node_modules/.bin/mocha --reporter-option maxDiffSize=16000 \
		lib/*.test.js
coverage: node_modules/.package-lock.json lib
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
	npx http-server ./output --cors
