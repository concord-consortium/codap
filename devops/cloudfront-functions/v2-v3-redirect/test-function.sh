#!/usr/bin/env bash
# R30a -- execution-time validation. Gates G3. ComputeUtilization is the operative
# measured quantity (% of CloudFront's per-invocation budget; 100% = hard limit).
# Targets: median < 50% (~0.5ms), p99 < 100% (~1.0ms), and no URI at/near 100%.
#
# Runs `aws cloudfront test-function` against every JSON fixture in test-events/, then
# computes median + p99 + max ComputeUtilization across the sample and gates on R30a.
set -euo pipefail
cd "$(dirname "$0")"
source ./config.env

# Get the LIVE ETag the test-function API requires.
ETAG=$(aws cloudfront describe-function --name "$FUNCTION_NAME" \
  --query 'ETag' --output text)

utils=()
for ev in test-events/*.json; do
  [ -f "$ev" ] || { echo "no fixtures in test-events/"; exit 1; }
  result=$(aws cloudfront test-function --name "$FUNCTION_NAME" --if-match "$ETAG" \
    --stage DEVELOPMENT --event-object "fileb://$ev" \
    --query 'TestResult.ComputeUtilization' --output text)
  printf '  %-60s ComputeUtilization=%s\n' "$(basename "$ev")" "$result"
  utils+=("$result")
done

n=${#utils[@]}
if [ "$n" -eq 0 ]; then
  echo "FAIL: no test-event fixtures found"
  exit 1
fi

# Sort numerically and compute the median, p99, and max.
sorted=$(printf '%s\n' "${utils[@]}" | sort -n)
median_idx=$(( n / 2 ))
p99_idx=$(( (n * 99 + 99) / 100 - 1 ))
if [ "$p99_idx" -lt 0 ]; then p99_idx=0; fi
median=$(echo "$sorted" | sed -n "$((median_idx + 1))p")
p99=$(echo "$sorted" | sed -n "$((p99_idx + 1))p")
max=$(echo "$sorted" | tail -n1)

echo
printf 'median ComputeUtilization: %s\n' "$median"
printf 'p99    ComputeUtilization: %s\n' "$p99"
printf 'max    ComputeUtilization: %s\n' "$max"

fail=0
if awk -v v="$median" 'BEGIN{exit !(v+0 >= 50)}'; then
  echo "FAIL: median >= 50 (R30a)"
  fail=1
fi
if awk -v v="$p99"    'BEGIN{exit !(v+0 >= 100)}'; then
  echo "FAIL: p99 >= 100 (R30a)"
  fail=1
fi
# R30a "no URI at/near 100%" -- treat >= 90 as too close.
if awk -v v="$max"    'BEGIN{exit !(v+0 >= 90)}'; then
  echo "FAIL: max >= 90 (R30a -- too close to the budget)"
  fail=1
fi
if [ "$fail" -ne 0 ]; then exit 1; fi
echo "PASS -- R30a / G3 satisfied."
