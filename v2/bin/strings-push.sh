#!/bin/bash
CURL='/usr/bin/curl'
POEDITOR_UPLOAD_URL="https://api.poeditor.com/v2/projects/upload"
API_TOKEN="$POEDITOR_API_TOKEN" # may be set as environment variable
UPDATING="terms_translations"
LANGUAGE="en-US"
OVERWRITE="1"
SYNC_TERMS="1"
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

# 1. strip comments
# 2. convert empty strings to [u200b] before push
# 3. use curl to push to POEditor
./node_modules/.bin/strip-json-comments "$INPUT_FILE" | \
    sed 's/"[ ]*:[ ]*""/": "[u200b]"/g' | \
    $CURL $CURLARGS $POEDITOR_UPLOAD_URL

echo ""
echo ""
