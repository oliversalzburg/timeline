# OpenTimeline - Working Draft

## Goals

1. Plaintext recording of point-in-time events.
1. Thin, composable tooling.
1. Staged solution with intermediate results.
1. Provide reference implementation in JS.

## Notes

- Timelines whose file name starts with `.` are private.
- Timelines whose file name starts with `_` are local (not part of universe).

```shell
dot -Tsvg:cairo timelines/mtg-editions.yml.gv > timelines/mtg-editions.yml.svg
```
