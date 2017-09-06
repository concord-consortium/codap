#!/bin/bash
cp -v lang/strings/en-US.json apps/dg/english.lproj/strings.js
sed -i "" 's/^{/SC.stringsFor("English", {/; s/^}$/});/' apps/dg/english.lproj/strings.js

cp -v lang/strings/he.json apps/dg/he.lproj/strings.js
sed -i "" 's/^{/SC.stringsFor("Hebrew", {/; s/^}$/});/' apps/dg/he.lproj/strings.js

cp -v lang/strings/tr.json apps/dg/tr.lproj/strings.js
sed -i "" 's/^{/SC.stringsFor("Turkish", {/; s/^}$/});/' apps/dg/tr.lproj/strings.js

cp -v lang/strings/zh-TW.json apps/dg/zh.lproj/strings.js
sed -i "" 's/^{/SC.stringsFor("Chinese", {/; s/^}$/});/' apps/dg/zh.lproj/strings.js
