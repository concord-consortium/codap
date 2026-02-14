#!/bin/bash
#
# Push V3-specific strings to POEditor.
#
# Only pushes strings with V3.* keys — DG.* strings are owned by the V2 build.
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

# Extract V3-only strings from JSON5 source
node -e "
const fs = require('fs');
const JSON5 = require('json5');
const data = JSON5.parse(fs.readFileSync('$INPUT_FILE', 'utf8'));
const v3 = {};
for (const [k, v] of Object.entries(data)) {
  if (k.startsWith('V3.')) v3[k] = v;
}
fs.writeFileSync('$TEMP_FILE', JSON.stringify(v3));
console.log('Pushing ' + Object.keys(v3).length + ' V3 strings to POEditor...');
"

PUSHARGS="-p $PROJECT_ID -i $TEMP_FILE -a $API_TOKEN"
./scripts/strings-push.sh $PUSHARGS
RESULT=$?

rm -f "$TEMP_FILE"
exit $RESULT
