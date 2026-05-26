#!/usr/bin/env bash
# R20b / SE-I2 -- build the deployed artifact dist/v2-v3-redirect.js by removing comments
# from the committed, fully-commented source. terser parses the JS properly (a naive regex
# strip would corrupt the RE_* regex literals and the https:// base-URL string). Comment
# removal ONLY -- --compress false --mangle false -- so the artifact is behavior-identical
# to the reviewed source.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
# terser CLI: omitting -c/-m disables compression and mangling entirely (defaults are
# OFF when the flags aren't passed). Comments are stripped via --comments false.
npx --yes terser v2-v3-redirect.js --comments false --output dist/v2-v3-redirect.js
node --check dist/v2-v3-redirect.js          # parse-validity smoke check
echo "built dist/v2-v3-redirect.js ($(wc -c < dist/v2-v3-redirect.js) bytes)"
