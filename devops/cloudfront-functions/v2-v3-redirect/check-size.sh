#!/usr/bin/env bash
# R20c -- verify the DEPLOYED artifact AND the largest synthetic-response body are each
# under CloudFront's 10 KB limits. Exit non-zero on failure (a build failure, not a
# runtime one).
set -euo pipefail
cd "$(dirname "$0")"
LIMIT=10240

# Build the deployed artifact first (comment-stripping only; see build-function.sh).
./build-function.sh

# R20b -- function package size = exact bytes of the deployed artifact dist/v2-v3-redirect.js.
pkg_bytes=$(wc -c < dist/v2-v3-redirect.js)
echo "deployed function: ${pkg_bytes} / ${LIMIT} bytes"
if [ "$pkg_bytes" -gt "$LIMIT" ]; then
  echo "FAIL: deployed function exceeds 10 KB (R20b)"
  exit 1
fi

# R20 -- synthetic-response body size. The body grows with {lang}; the longest {lang} R3's
# pattern admits is 8 chars (xxx-yyyy, e.g. "abc-defg"). Render that worst case and
# measure it.
body_bytes=$(node -e '
  const { loadHandler, makeEvent } = require("./test-harness");
  const res = loadHandler()(makeEvent("/app/static/dg/abc-defg/cert/index.html"));
  process.stdout.write(String(Buffer.byteLength(res.body, "utf8")));
')
echo "synthetic body:   ${body_bytes} / ${LIMIT} bytes"
if [ "$body_bytes" -gt "$LIMIT" ]; then
  echo "FAIL: synthetic body exceeds 10 KB (R20)"
  exit 1
fi
echo "PASS -- both 10 KB budgets satisfied (G4)."
