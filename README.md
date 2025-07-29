# Open Time-Travel Engine - Working Draft

## Abstract

The Open Time-Travel Engine is designed to allow for read-only access to the past.

The engine has to be assembled, fueled, and operated by a single traveler. There is no support to share experiences from the journey with additional passengers.

This repository contains all crucial parts for the engine. Ensure to assemble it out of sight.

## Goals

1. Simplicity
1. Plaintext recording of point-in-time events with journal-like complexity. Derive value from data, not metadata.
1. Thin, composable tooling.
1. Staged solution with intermediate results.
1. Long-term, private maintenance with no strings attached. No online services. No data exchange.
1. Provide fully tested reference implementation in JS. Fully covered unit test suite + E2E integration test suite, to encourage adoption.

## Notes

- Timelines whose file name starts with `.` are private.
- Timelines whose file name starts with `_` are local (not part of universe).

```shell
# Rebuild MTG editions data set.
dot -Tsvg:cairo timelines/mtg-editions.yml.gv > timelines/mtg-editions.yml.svg

# Profile build
remake --profile --jobs --keep-going --output-sync profile
gprof2dot -e0 -n0 --format=callgrind callgrind.out.* > callgrind.out.dot
```

All rights reserved.
