#!/bin/bash
PROJECT_ID=125447
OUTPUT_DIR=src/utilities/translation/lang
LANGUAGES=("de" "el" "es" "fr" "fa" "he" "ja" "nb" "nn" "nl" "pt-BR" "th" "tr" "zh-TW" "zh-Hans")
LANG_COUNT=${#LANGUAGES[@]}

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

for (( i=0; i<=$(( $LANG_COUNT-1 )); i++ ))
do
    LANGUAGE="${LANGUAGES[$i]}"
    echo "Requesting strings for '$LANGUAGE'..."
    PULLARGS="-p $PROJECT_ID -l $LANGUAGE -o $OUTPUT_DIR -a $API_TOKEN"
    # echo "PULLARGS=$PULLARGS"
    ./scripts/strings-pull.sh $PULLARGS

    # extract language code (the part before the hyphen)
    LANG_CODE=$LANGUAGE #$(echo $LANGUAGE | cut -d '-' -f 1)

    echo ""
done
