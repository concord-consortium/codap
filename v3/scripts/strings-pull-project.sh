#!/bin/bash
#
# Pull translations for all languages from POEditor with per-language
# timeout and automatic retry of failed languages.
#
# After pulling non-English languages, pulls en-US and splits it into
# separate DG (V2-owned) and V3-owned string files.
#
# Usage: ./scripts/strings-pull-project.sh -a <api_token> [-o <output_dir>]
#
PROJECT_ID=125447
OUTPUT_DIR=src/utilities/translation/lang
LANGUAGES=("de" "el" "es" "fa" "he" "ja" "ko" "nb" "nn" "pt-BR" "th" "tr" "zh-TW" "zh-Hans")
MAX_RETRIES=3
TIMEOUT_SECS=60

# argument processing from https://stackoverflow.com/a/14203146
while [[ $# -gt 1 ]]
do
key="$1"

case $key in
    -a|--api_token)
    API_TOKEN="$2"
    shift # past argument
    ;;
    -o|--output_dir)
    OUTPUT_DIR="$2"
    shift # past argument
    ;;
esac
shift # past argument or value
done

[[ -z "$API_TOKEN" ]] && { echo "No API_TOKEN provided! Use -a <token>" ; exit 1; }

LANG_COUNT=${#LANGUAGES[@]}

# Portable timeout: works on macOS without coreutils
run_with_timeout() {
    local secs=$1; shift
    "$@" &
    local cmd_pid=$!
    ( sleep "$secs" && kill "$cmd_pid" 2>/dev/null ) &
    local sleep_pid=$!
    wait "$cmd_pid" 2>/dev/null
    local result=$?
    kill "$sleep_pid" 2>/dev/null
    wait "$sleep_pid" 2>/dev/null
    return $result
}

# Pull a single language and verify the result
pull_language() {
    local lang=$1
    local output_file="$OUTPUT_DIR/$lang.json"

    run_with_timeout "$TIMEOUT_SECS" \
        ./scripts/strings-pull.sh -p "$PROJECT_ID" -l "$lang" -o "$OUTPUT_DIR" -a "$API_TOKEN" \
        2>/dev/null

    # Verify: file exists, is non-empty, and looks like JSON
    if [[ -f "$output_file" ]] && [[ -s "$output_file" ]] && head -c1 "$output_file" | grep -q '{'; then
        return 0
    else
        rm -f "$output_file"
        return 1
    fi
}

echo "Pulling translations for $LANG_COUNT languages (POEditor project $PROJECT_ID)"
echo ""

# First pass
FAILED_LANGS=()
for lang in "${LANGUAGES[@]}"; do
    printf "  %-10s " "$lang:"
    if pull_language "$lang"; then
        echo "Success"
    else
        echo "FAILED"
        FAILED_LANGS+=("$lang")
    fi
done

# Retry loop
attempt=2
while [[ ${#FAILED_LANGS[@]} -gt 0 ]] && [[ $attempt -le $MAX_RETRIES ]]; do
    echo ""
    echo "Retrying ${#FAILED_LANGS[@]} failed language(s) (attempt $attempt of $MAX_RETRIES)..."
    RETRY_LANGS=("${FAILED_LANGS[@]}")
    FAILED_LANGS=()

    for lang in "${RETRY_LANGS[@]}"; do
        printf "  %-10s " "$lang:"
        if pull_language "$lang"; then
            echo "Success"
        else
            echo "FAILED"
            FAILED_LANGS+=("$lang")
        fi
    done

    ((attempt++))
done

# Summary for non-English languages
echo ""
SUCCESSFUL_COUNT=0
for lang in "${LANGUAGES[@]}"; do
    if [[ -f "$OUTPUT_DIR/$lang.json" ]]; then
        ((SUCCESSFUL_COUNT++))
    fi
done

echo "=== Non-English Summary ==="
echo "  Succeeded: $SUCCESSFUL_COUNT / $LANG_COUNT"
if [[ ${#FAILED_LANGS[@]} -gt 0 ]]; then
    echo "  Failed:    ${FAILED_LANGS[*]}"
fi

# Pull en-US and split into DG and V3 files
echo ""
echo "Pulling en-US and splitting into DG/V3 files..."
printf "  %-10s " "en-US:"
if pull_language "en-US"; then
    echo "Success"

    # Split en-US into DG and V3 files
    node -e "
const fs = require('fs');
const pulled = JSON.parse(fs.readFileSync('$OUTPUT_DIR/en-US.json', 'utf8'));
const dg = {}, v3 = {};
for (const [k, v] of Object.entries(pulled)) {
  if (k.startsWith('V3.')) v3[k] = v;
  else dg[k] = v;
}
fs.writeFileSync('$OUTPUT_DIR/en-US-dg.json', JSON.stringify(dg, null, 4) + '\n');
fs.writeFileSync('/tmp/poeditor-v3-strings.json', JSON.stringify(v3, null, 4) + '\n');
console.log('  DG strings: ' + Object.keys(dg).length);
console.log('  V3 strings: ' + Object.keys(v3).length);
"
    rm "$OUTPUT_DIR/en-US.json"  # Remove the combined download
else
    echo "FAILED - en-US pull failed after retries"
    exit 1
fi

# Final summary
echo ""
echo "=== Complete ==="
if [[ ${#FAILED_LANGS[@]} -gt 0 ]]; then
    echo "WARNING: Some languages failed after $MAX_RETRIES attempts."
    echo "You can retry individual languages with:"
    echo "  ./scripts/strings-pull.sh -p $PROJECT_ID -l LANG -o $OUTPUT_DIR -a \$POEDITOR_API_TOKEN"
    exit 1
else
    echo "All languages pulled successfully."
fi
