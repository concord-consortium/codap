#!/bin/bash
#
# Convert the English source strings (JSON with comments) to SproutCore JS format.
#
# Input:  lang/strings/en-US.json      (JSON key-value pairs, may contain comments)
# Output: apps/dg/english.lproj/strings.js  (wrapped with SC.stringsFor("en", {...}))
#
# This is also done at the end of strings-pull-project.sh after pulling translations.
#
sed "s/^{/SC.stringsFor(\"en\", {/; s/^}$/});/" \
    <"lang/strings/en-US.json" >"apps/dg/english.lproj/strings.js"
