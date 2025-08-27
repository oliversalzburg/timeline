#!/usr/bin/env bash

BASE=$1

make "${BASE}-universe.info"
SEGMENTS=$(ls "${BASE}"*.gvus)
ISVGUS=${SEGMENTS[*]//.gvus/.isvgus}
make -j20 $ISVGUS
rm ${SEGMENTS}
node --enable-source-maps contrib/svgcat.js \
		--target=$BASE-universe.svg $ISVGUS
rm ${ISVGUS}
