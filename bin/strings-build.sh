#!/bin/bash

# special case for copying English strings
sed "s/^{/SC.stringsFor(\"en\", {/; s/^}$/});/" \
    <"lang/strings/en-US.json" >"apps/dg/english.lproj/strings.js"
