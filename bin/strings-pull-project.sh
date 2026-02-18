#!/bin/bash
#
# Pull translations for all languages from POEditor with per-language
# timeout and automatic retry of failed languages.
#
# Usage: ./bin/strings-pull-project.sh -a <api_token> [-o <output_dir>]
#
PROJECT_ID=125447
OUTPUT_DIR=lang/strings
LANGUAGES=("ar" "de" "el" "es" "fa" "fr" "he" "ja" "ko" "nb" "nl" "nn" "pl" "pt-BR" "th" "tr" "zh-TW" "zh-Hans")
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
        ./bin/strings-pull.sh -p "$PROJECT_ID" -l "$lang" -o "$OUTPUT_DIR" -a "$API_TOKEN" \
        2>/dev/null

    # Verify: file exists, is non-empty, and looks like JSON
    if [[ -f "$output_file" ]] && [[ -s "$output_file" ]] && head -c1 "$output_file" | grep -q '{'; then
        return 0
    else
        rm -f "$output_file"
        return 1
    fi
}

# Convert a downloaded JSON file to SproutCore JS format
install_language() {
    local lang=$1
    local json_file="$OUTPUT_DIR/$lang.json"
    local lproj_dir="apps/dg/$lang.lproj"

    mkdir -p "$lproj_dir"
    sed "s/^{/SC.stringsFor(\"$lang\", {/; s/^}$/});/" \
        <"$json_file" >"$lproj_dir/strings.js"
    rm "$json_file"
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

# Convert all successful downloads to JS
echo ""
SUCCESSFUL_COUNT=0
for lang in "${LANGUAGES[@]}"; do
    if [[ -f "$OUTPUT_DIR/$lang.json" ]]; then
        install_language "$lang"
        ((SUCCESSFUL_COUNT++))
    fi
done

# Also convert English source to JS
sed "s/^{/SC.stringsFor(\"en\", {/; s/^}$/});/" \
    <"$OUTPUT_DIR/en-US.json" >"apps/dg/english.lproj/strings.js"

# Summary
echo "=== Summary ==="
echo "  Succeeded: $SUCCESSFUL_COUNT / $LANG_COUNT"
if [[ ${#FAILED_LANGS[@]} -gt 0 ]]; then
    echo "  Failed:    ${FAILED_LANGS[*]}"
    echo ""
    echo "WARNING: Some languages failed after $MAX_RETRIES attempts."
    echo "You can retry individual languages with:"
    echo "  ./bin/strings-pull.sh -p $PROJECT_ID -l LANG -o $OUTPUT_DIR -a \$POEDITOR_API_TOKEN"
    exit 1
else
    echo "  All languages pulled successfully."
fi
