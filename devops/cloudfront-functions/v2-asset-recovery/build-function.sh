#!/usr/bin/env bash
# Build the deployed artifact dist/v2-asset-recovery.js by removing comments from the
# committed, fully-commented source. terser parses the JS properly and we disable
# compression and mangling (no -c/-m), so the artifact is behavior-identical to the
# reviewed source. Mirrors v2-v3-redirect/build-function.sh.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
npx --yes terser v2-asset-recovery.js --comments false --output dist/v2-asset-recovery.js
node --check dist/v2-asset-recovery.js          # parse-validity smoke check
echo "built dist/v2-asset-recovery.js ($(wc -c < dist/v2-asset-recovery.js) bytes)"
