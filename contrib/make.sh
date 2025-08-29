#!/usr/bin/env bash

set -o errexit

BASE=$1

echo $MAKEFLAGS

make "${BASE}-universe.info"
SEGMENTS=$(ls "${BASE}"*.gvus)
ISVGUS=${SEGMENTS[*]//.gvus/.isvgus}
make $ISVGUS
node --enable-source-maps contrib/svgcat.js \
		--target=$BASE-universe.svg.loose $ISVGUS
node --enable-source-maps contrib/svgnest.js \
		--assets=output/images \
		--target=$BASE-universe.svg.loose > $BASE-universe.svg
