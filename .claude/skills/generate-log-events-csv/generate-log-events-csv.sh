#!/bin/bash
#
# generate-log-events-csv.sh [--check]
#
# Regenerate the CODAP v3 log-events dictionary CSV (codap-v3-log-events.csv, next to
# this script). It runs the deterministic AST extractor over v3/src, then merges the
# results into the CSV, preserving human-curated Placeholders / Parameters / Descriptions
# and reporting any NEW or REMOVED events.
#
# Options:
#   --check   Report drift and exit non-zero if there are NEW or REMOVED events. Does not
#             write the CSV. Useful for CI to detect that the code and the dictionary have
#             diverged.
#
# Requirements: Node.js and the v3 dependencies installed (the extractor resolves the
# repo's own `typescript` from v3/node_modules). Run `npm install` in v3 first if needed.
#
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CSV="$SKILL_DIR/codap-v3-log-events.csv"

# Detect --check (report-only) mode.
CHECK=0
for arg in "$@"; do
  [ "$arg" = "--check" ] && CHECK=1
done

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# 1) Deterministic extraction: all log events the code can emit -> JSON.
node "$SKILL_DIR/extract-log-events.mjs" > "$TMP"

# 2) Merge with the committed CSV, preserving curated fields; report new/removed events.
# Positional args (the extraction JSON and the CSV path) come first so a stray non-flag
# argument to this script can't displace them; build-csv.mjs reads flags such as --check
# from anywhere in the argument list.
node "$SKILL_DIR/build-csv.mjs" "$TMP" "$CSV" "$@"

# 3) Final step (skipped in --check mode): copy the data rows (no header) to the system
#    clipboard as tab-separated text, ready to paste into the Google Sheet at cell A2.
if [ "$CHECK" -eq 0 ]; then
  node "$SKILL_DIR/copy-rows-to-clipboard.mjs" "$CSV"
fi
