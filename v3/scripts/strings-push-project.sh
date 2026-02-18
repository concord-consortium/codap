#!/bin/bash
#
# Push all English strings to POEditor.
#
# V3 owns all string pushes to POEditor — both DG.* and V3.* keys.
# Uses additive mode (sync_terms=0) so no terms are deleted.
#
# Usage: ./scripts/strings-push-project.sh -a <api_token>
#
PROJECT_ID="125447"
INPUT_FILE="src/utilities/translation/lang/en-US.json5"
TEMP_FILE="/tmp/codap-strings-push.json"

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
console.log('Pushing ' + Object.keys(data).length + ' strings to POEditor...');
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
