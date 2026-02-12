#!/bin/bash
#
# Pull translated strings for a single language from POEditor.
#
# Uses the POEditor v2 export API to download a key-value JSON file for the
# specified language. The downloaded file has POEditor's [uXXXX] Unicode escape
# notation converted to standard \uXXXX JSON escapes.
#
# API token is resolved in order: -a argument > ~/.porc > $POEDITOR_API_TOKEN env var.
#
# Usage: ./bin/strings-pull.sh -p <project_id> -l <language> -o <output_dir> -a <api_token>
#
# Output: <output_dir>/<language>.json
#

CURL='/usr/bin/curl'
POEDITOR_EXPORT_URL="https://api.poeditor.com/v2/projects/export"
API_TOKEN="$POEDITOR_API_TOKEN" # may be set as environment variable
OUTPUT_DIR="." # default before argument processing

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
    -l|--language)
    LANGUAGE="$2"
    shift # past argument
    ;;
    -o|--output_dir)
    OUTPUT_DIR="$2"
    shift # past argument
    ;;
esac
shift # past argument or value
done

[[ -z "$API_TOKEN" ]] && { echo "No API_TOKEN available!" ; exit 1; }
[[ -z "$PROJECT_ID" ]] && { echo "No PROJECT_ID provided!" ; exit 1; }
[[ -z "$LANGUAGE" ]] && { echo "No LANGUAGE provided!" ; exit 1; }

CURLARGS="-X POST -d id=$PROJECT_ID -d language=$LANGUAGE -d type=key_value_json -d api_token=$API_TOKEN"
# echo "CURLARGS='$CURLARGS'"

# Step 1: Request an export from POEditor (returns a JSON response with a download URL)
RESPONSE=$($CURL $CURLARGS $POEDITOR_EXPORT_URL)
# extract the file URL from the response
FILE_URL=$(echo $RESPONSE | cut -d '"' -f 20)

if [ "$FILE_URL" = "" ] ; then echo "Error: $RESPONSE" 1>&2; exit 2; fi

# eliminate the extraneous '\' characters in URL
FILE_URL=$(echo $FILE_URL | tr -d \\ )

# Step 2: Download the exported file, converting POEditor's [uXXXX] to standard \uXXXX
$CURL $FILE_URL | sed 's/\[u\([0-9a-fA-F]\{4\}\)\]/\\u\1/g' > "$OUTPUT_DIR/$LANGUAGE.json"
