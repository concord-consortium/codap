#!/bin/bash

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

# retrieve the initial API response
RESPONSE=$($CURL $CURLARGS $POEDITOR_EXPORT_URL)
# extract the file URL from the initial response
FILE_URL=$(echo $RESPONSE | cut -d '"' -f 20)

if [ "$FILE_URL" = "" ] ; then echo "Error: $RESPONSE" 1>&2; exit 2; fi

# eliminate the extraneous '\' characters in URL
FILE_URL=$(echo $FILE_URL | tr -d \\ )

# download and process the resulting file, e.g. replace '[u12ef]' with '\u12ef'
$CURL $FILE_URL | sed 's/\[u\([0-9a-fA-F]\{4\}\)\]/\\u\1/g' > "$OUTPUT_DIR/$LANGUAGE.json"
