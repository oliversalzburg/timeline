#!/usr/bin/env bash

BASE=$1

SEGMENTS=$(ls "${BASE}"*.gvus)
DOTUS=${SEGMENTS[*]//.gvus/.dotus}
make -j20 $DOTUS
IDOTUS=${SEGMENTS[*]//.gvus/.idotus}
make -j20 $IDOTUS
ISVGUS=${SEGMENTS[*]//.gvus/.isvgus}
make -j20 $ISVGUS
node --enable-source-maps contrib/svgcat.js \
		--target=$BASE-universe.svg $ISVGUS
