#!/bin/bash
#
# Push V3-specific strings to POEditor.
#
# Pushes all strings from en-US-v3.json5 (mostly V3.* keys, plus any DG.* keys
# that are V3-owned). DG.* strings from V2 master are managed by the V2 build.
# Uses additive mode (sync_terms=0) so no terms are deleted.
#
# Usage: ./scripts/strings-push-project.sh -a <api_token>
#
PROJECT_ID="125447"
INPUT_FILE="src/utilities/translation/lang/en-US-v3.json5"
TEMP_FILE="/tmp/v3-strings-push.json"

# argument processing
while [[ $# -gt 1 ]]
do
key="$1"
case $key in
    -a|--api_token)
    API_TOKEN="$2"
    shift
    ;;
esac
shift
done

[[ -z "$API_TOKEN" ]] && { echo "No API_TOKEN provided! Use -a <token>" ; exit 1; }

# Convert JSON5 to JSON for the push script
node -e "
const fs = require('fs');
const JSON5 = require('json5');
const data = JSON5.parse(fs.readFileSync('$INPUT_FILE', 'utf8'));
fs.writeFileSync('$TEMP_FILE', JSON.stringify(data));
console.log('Pushing ' + Object.keys(data).length + ' V3-owned strings to POEditor...');
"

if [[ $? -ne 0 ]] || [[ ! -s "$TEMP_FILE" ]]; then
    echo "ERROR: Failed to extract strings from $INPUT_FILE"
    rm -f "$TEMP_FILE"
    exit 1
fi

./scripts/strings-push.sh -p "$PROJECT_ID" -i "$TEMP_FILE" -a "$API_TOKEN"
RESULT=$?

rm -f "$TEMP_FILE"
exit $RESULT
