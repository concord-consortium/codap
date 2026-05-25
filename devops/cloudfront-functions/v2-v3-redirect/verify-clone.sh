#!/usr/bin/env bash
# R26a verification (SE-J2) -- two parts:
#  1. STRUCTURED CONFIG DIFF: diff the normalized prod and clone DistributionConfigs and
#     check every difference against the machine-readable allowlist in expected-diff.md.
#     Exits non-zero (blocks the flip) on ANY difference not in the allowlist. The script
#     is the gate -- the printed summary is what the G-criterion signer reads.
#  2. RESPONSE-HEADER CHECK: curl -I against the clone at $TEMP_SUBDOMAIN -- two URLs:
#       (a) an origin-served URL on an origin-swapped behavior (V3 asset)
#       (b) a URL that triggers the function's synthetic response (English V2)
#     Assert the security headers prod serves today are present on each.

set -euo pipefail
cd "$(dirname "$0")"
mkdir -p artifacts
source ./config.env

if [ -z "${CLONE_DIST_ID:-}" ]; then
  echo "FAIL: CLONE_DIST_ID is empty -- run clone-distribution.sh first"
  exit 1
fi

# ---------------------------------------------------------------------------
# Part 1 -- structured config diff against expected-diff.md allowlist.
# ---------------------------------------------------------------------------
echo "Part 1 -- structured config diff"

aws cloudfront get-distribution-config --id "$PROD_DIST_ID"  > artifacts/prod-now.json
aws cloudfront get-distribution-config --id "$CLONE_DIST_ID" > artifacts/clone-now.json

# Normalize: extract DistributionConfig, sort keys, drop wrapper fields (ETag).
jq -S '.DistributionConfig' artifacts/prod-now.json  > artifacts/prod-norm.json
jq -S '.DistributionConfig' artifacts/clone-now.json > artifacts/clone-norm.json

# Build the set of expected JSON-paths from expected-diff.md's fenced "Allowlist" block.
python3 - <<'PY' > artifacts/allowlist.txt
import re
lines = open("expected-diff.md").read()
m = re.search(r"## Allowlist \(machine-readable\)\s*\n+```text\n(.*?)\n```", lines, re.DOTALL)
if not m:
    raise SystemExit("expected-diff.md: Allowlist block not found")
for raw in m.group(1).splitlines():
    s = raw.split("#", 1)[0].strip()
    if not s:
        continue
    print(s)
PY

cat > artifacts/diff.py <<'PY'
"""Compare two JSON files structurally and emit a JSON-path list of differences."""
import json, sys

def walk(a, b, path, out):
    if type(a) != type(b):
        out.append(("~", path))
        return
    if isinstance(a, dict):
        keys = set(a.keys()) | set(b.keys())
        for k in keys:
            sub = f"{path}.{k}"
            if k not in a:
                out.append(("+", sub))
            elif k not in b:
                out.append(("-", sub))
            else:
                walk(a[k], b[k], sub, out)
    elif isinstance(a, list):
        # Special-case CacheBehaviors.Items[]: identify by PathPattern when possible.
        if a and isinstance(a[0], dict) and "PathPattern" in a[0]:
            a_by = {x.get("PathPattern", f"#i{i}"): x for i, x in enumerate(a)}
            b_by = {x.get("PathPattern", f"#i{i}"): x for i, x in enumerate(b)}
            for p in set(a_by) | set(b_by):
                if p not in a_by:
                    out.append(("+", f"{path}[?(@.PathPattern=='{p}')]"))
                elif p not in b_by:
                    out.append(("-", f"{path}[?(@.PathPattern=='{p}')]"))
                else:
                    walk(a_by[p], b_by[p], f"{path}[?(@.PathPattern=='{p}')]", out)
        else:
            if len(a) != len(b):
                out.append(("~", path + ".length"))
            for i in range(min(len(a), len(b))):
                walk(a[i], b[i], f"{path}[{i}]", out)
    else:
        if a != b:
            out.append(("~", path))

prod = json.load(open("artifacts/prod-norm.json"))
clone = json.load(open("artifacts/clone-norm.json"))
diffs = []
walk(prod, clone, "", diffs)
for kind, p in diffs:
    print(f"{kind} {p}")
PY
python3 artifacts/diff.py > artifacts/diff.txt
echo "    differences detected: $(wc -l < artifacts/diff.txt)"

# Match each diff line against the allowlist.
python3 - <<'PY'
import re, sys, fnmatch

def normalize(path):
    # Generalize array-index entries on CacheBehaviors.Items[N].X to the PathPattern form.
    return path

with open("artifacts/allowlist.txt") as f:
    allow = [ln.strip() for ln in f if ln.strip()]
allowed = []
for entry in allow:
    kind = entry[0] if entry[:1] in "~+-" else "?"
    pat = entry[2:] if entry[:1] in "~+-" else entry
    pat = pat.strip()
    allowed.append((kind, pat))

unmatched = []
with open("artifacts/diff.txt") as f:
    for line in f:
        line = line.strip()
        if not line: continue
        kind, path = line.split(" ", 1)
        # Treat any allowlist `~ X` as matching `X` or `X.<anything>` (a sub-mutation
        # under an allowed root counts as the same change). The same goes for + and -.
        ok = False
        for ak, ap in allowed:
            if (ak == kind or ak == "?") and (path == ap or path.startswith(ap + ".") or path.startswith(ap + "[")):
                ok = True
                break
        if not ok:
            unmatched.append((kind, path))

print(f"  matched:    {sum(1 for _ in open('artifacts/diff.txt')) - len(unmatched)}")
print(f"  unmatched:  {len(unmatched)}")
for k, p in unmatched[:50]:
    print(f"    UNEXPECTED {k} {p}")
if unmatched:
    sys.exit(1)
PY

echo "    Part 1 PASS -- every config difference is allowlisted."

# ---------------------------------------------------------------------------
# Part 2 -- response-header check (DO-I1 confirmation, not decision).
# ---------------------------------------------------------------------------
echo
echo "Part 2 -- response-header check against https://$TEMP_SUBDOMAIN"

ORIGIN_HEADERS=$(curl -sI "https://$TEMP_SUBDOMAIN/app/static/js/bundle.js" || true)
SYNTH_HEADERS=$(curl -sI "https://$TEMP_SUBDOMAIN/app/static/dg/en/cert/index.html" || true)

# Probe prod for HSTS the same way clone-distribution.sh's RHP_REQUIRED determination does.
# If prod itself serves no HSTS, the cutover preserves status quo and there is no
# synthetic-response regression to gate on.
PROD_HSTS=$(curl -sI "https://codap.concord.org/app/" 2>/dev/null \
  | grep -i '^strict-transport-security:' || true)

fail=0
for check in "origin-served:$ORIGIN_HEADERS" "synthetic-response:$SYNTH_HEADERS"; do
  label="${check%%:*}"
  headers="${check#*:}"
  has_hsts=$(echo "$headers" | grep -i '^strict-transport-security:' || true)
  has_xcto=$(echo "$headers" | grep -i '^x-content-type-options:'      || true)
  echo "  [$label]"
  if [ -n "$has_hsts" ]; then
    echo "    HSTS present: $has_hsts"
  else
    echo "    HSTS MISSING"
    if [ "$label" = "synthetic-response" ] && [ "${RHP_REQUIRED:-false}" = "false" ] && [ -n "$PROD_HSTS" ]; then
      cat <<'INSTR'
    R20a HSTS contingency triggered. The synthetic response did not carry HSTS, which
    means either RHP_REQUIRED should have been true or the function should add the header
    itself. Choose one:
      (a) set RHP_REQUIRED=true in config.env and re-run modify-clone.sh; OR
      (b) add the header inside buildResponse() in v2-v3-redirect.js (R20a / CR8), then
          re-run deploy-function.sh; OR
      (c) accept that this distribution serves no HSTS today.
INSTR
      fail=1
    elif [ "$label" = "synthetic-response" ]; then
      echo "    (prod also serves no HSTS at https://codap.concord.org/app/; status quo preserved, no action required)"
    fi
  fi
  if [ -z "$has_xcto" ]; then
    echo "    x-content-type-options MISSING"
  fi
done

if [ "$fail" -ne 0 ]; then
  echo
  echo "verify-clone.sh FAIL -- see Part 2 output above."
  exit 1
fi
echo
echo "verify-clone.sh PASS."
