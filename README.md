# Open Time-Travel Engine

## Abstract

The Open Time-Travel Engine is designed to allow for read-only access to the
past.

The engine has to be assembled, fueled, and operated by a single traveler. There
is no support to share experiences from the journey with additional passengers.

This repository contains all crucial parts for the engine. Ensure to assemble it
out of sight. There are no assembly instructions. Good luck.

## Goals

1. 	Plaintext recording of point-in-time events with journal-like complexity.
	Derive value from data, not metadata.
1.	Thin, composable tooling.
1.	Staged solution with intermediate results.
1.	Long-term, private maintenance with no strings attached. No online services.
	No data exchange.

## Timeline Authoring Guidelines

### Column Limits

Assuming leading indentation of **4** columns:

1.	Ideal: **50**
1.	Concerning: **65**
1.	Problematic: **80**

![Column limits in editor](column-limits.png)

When the entry is a list, causing **6** columns of indentation, the same limits
apply.
Having multiple events on a single entry, will already incur additional space
penalties.

Rule of thumb: **Never** go beyond _ideal_. Break lines, as soon as you're **1**
character over the limit. Longer entries may be considered highlights.

### Line Limits

1.	Ideal: **1 - 2** lines
1.	Concerning: **3** lines
1.	Problematic: **4** lines

Touching _problematic_ range is strongly discouraged.

### Breaking Limits

Entries, that are hard to contain within in the given boundaries, should be
evaluated for event metadata refactoring. Commonly, identities can be inferred
from the entry.

## Notes

```shell
# Build universe straight-forward
remake <origin>

# Build universe
remake --jobs=24 --max-load=24 --silent --output-sync <origin> 2>&1 | tee build.log

# Rebuild MTG editions data set.
dot -Tsvg:cairo timelines/mtg-editions.yml.gv > timelines/mtg-editions.yml.svg

# Profile build
remake --profile --jobs --keep-going --output-sync profile
gprof2dot -e0 -n0 --format=callgrind callgrind.out.* > callgrind.out.dot
```

```
apt-get install pandoc librsvg2-bin texlive-latex-extra texlive-latex-recommended texlive-xetex texlive-luatex context groff libjs-mathjax node-katex citation-style-language-styles
```

All rights reserved.
