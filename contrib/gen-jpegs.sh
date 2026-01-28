#!/usr/bin/env bash

HERE=$(dirname "$0")
mkdir --parents output/.gen
if [ -e "output/.gen/.exiftool.tmp.json" ]; then
	echo "Reusing cached EXIF data." >&2
	cp "output/.gen/.exiftool.tmp.json" "$1/.exiftool.tmp.json"
else
	echo "Extracting EXIF data..." >&2
	exiftool -json -quiet -recurse "$1" > "$1/.exiftool.tmp.json"
	cp "$1/.exiftool.tmp.json" output/.gen/
fi
echo "Generating documents..." >&2
"${HERE}/gen-jpeg.js" --target=output/.gen "$1/.exiftool.tmp.json"
rm "$1/.exiftool.tmp.json"
