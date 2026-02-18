#!/bin/bash
CURL='/usr/bin/curl'
POEDITOR_UPLOAD_URL="https://api.poeditor.com/v2/projects/upload"
API_TOKEN="$POEDITOR_API_TOKEN" # may be set as environment variable
# updating: "terms" (add new terms only), "terms_translations" (add/update terms and translations),
#           "translations" (update translations only)
UPDATING="terms_translations"
LANGUAGE="en-US"
# overwrite: 1 = overwrite existing translations with uploaded values, 0 = keep existing
OVERWRITE="1"
# sync_terms: 1 = DELETE terms from POEditor that are not in the upload, 0 = leave them alone.
# Must be 0 when multiple projects (e.g. CODAP V2 and V3) share the same POEditor project,
# otherwise one project's push would delete the other's terms.
SYNC_TERMS="0"
# fuzzy_trigger: 1 = mark existing translations as fuzzy when the source term changes
FUZZY_TRIGGER="1"

# override with defaults, if rc is present
[ -f $HOME/.porc ] && . $HOME/.porc

# argument processing from https://stackoverflow.com/a/14203146
while [[ $# -gt 1 ]]
do
key="$1"

case $key in
    -a|--api_token)
    API_TOKEN="$2"
    shift # past argument
    ;;
    -p|--project_id)
    PROJECT_ID="$2"
    shift # past argument
    ;;
    -i|--input_file)
    INPUT_FILE="$2"
    shift # past argument
    ;;
esac
shift # past argument or value
done

[[ -z "$API_TOKEN" ]] && { echo "No API_TOKEN available!" ; exit 1; }
[[ -z "$PROJECT_ID" ]] && { echo "No PROJECT_ID provided!" ; exit 1; }

CURLARGS="-X POST -F api_token=$API_TOKEN -F id=$PROJECT_ID
-F updating=$UPDATING -F file=@-;filename=$INPUT_FILE -F language=$LANGUAGE
-F overwrite=$OVERWRITE -F sync_terms=$SYNC_TERMS -F FUZZY_TRIGGER=$FUZZY_TRIGGER"

# echo "CURLARGS = '$CURLARGS'"

# 1. Parse input (supports JSON5 comments and trailing commas)
# 2. Convert empty strings to zero-width space [u200b] for POEditor
# 3. Use curl to push to POEditor
node -e "
const fs = require('fs');
const JSON5 = require('json5');
const data = JSON5.parse(fs.readFileSync('$INPUT_FILE', 'utf8'));
for (const k of Object.keys(data)) { if (data[k] === '') data[k] = '\u200b'; }
process.stdout.write(JSON.stringify(data));
" | $CURL $CURLARGS $POEDITOR_UPLOAD_URL

echo ""
echo ""
