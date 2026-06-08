#!/usr/bin/env bash
# Verify the DEPLOYED artifact is under CloudFront's 10 KB function-package limit. This
# function emits no synthetic response, so (unlike v2-v3-redirect) there is no body budget.
set -euo pipefail
cd "$(dirname "$0")"
LIMIT=10240

./build-function.sh
pkg_bytes=$(wc -c < dist/v2-asset-recovery.js)
echo "deployed function: ${pkg_bytes} / ${LIMIT} bytes"
if [ "$pkg_bytes" -gt "$LIMIT" ]; then
  echo "FAIL: deployed function exceeds 10 KB"
  exit 1
fi
echo "PASS -- function-package budget satisfied."
