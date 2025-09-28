#!/usr/bin/env bash

set -o errexit

BASE=$1

make --no-print-directory "${BASE}-universe.info"
SEGMENTS=$(ls "${BASE}"*.gvus)
ISVGUS=${SEGMENTS[*]//.gvus/.isvgus}
make --no-print-directory $ISVGUS
rm $SEGMENTS
node --enable-source-maps contrib/svgcat.js \
	"--target=$BASE-universe.svg.loose" $ISVGUS
rm $ISVGUS
node --enable-source-maps contrib/svgnest.js \
	--assets=output \
	"--target=$BASE-universe.svg.loose" > "$BASE-universe.svg"
rm $BASE-universe.svg.loose
