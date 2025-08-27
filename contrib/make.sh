#!/usr/bin/env bash

BASE=$1

make "${BASE}-universe.info"
SEGMENTS=$(ls "${BASE}"*.gvus)
ISVGUS=${SEGMENTS[*]//.gvus/.isvgus}
make -j20 $ISVGUS
rm ${SEGMENTS}
node --enable-source-maps contrib/svgcat.js \
		--target=$BASE-universe.svg.loose $ISVGUS
rm ${ISVGUS}
node --enable-source-maps contrib/svgnest.js \
		--assets=output/images \
		--target=$BASE-universe.svg.loose > $BASE-universe.svg
#rm $BASE-universe.svg.loose
