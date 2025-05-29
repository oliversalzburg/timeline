#!/bin/env bash

curl \
  --header "accept:application/json" \
  --header "user-agent:GithubOliversalzburgTimeline/0.1" \
  https://api.scryfall.com/sets > sets.json

yq -p=json -o=yaml '(.data | filter(.set_type=="core" or .set_type=="expansion" or .set_type=="funny" or .set_type=="masters"))[] as $item ireduce ({}; .[$item | .released_at] = ($item | "\(.name) (\(.code | upcase))"))' sets.json > sets.yml
