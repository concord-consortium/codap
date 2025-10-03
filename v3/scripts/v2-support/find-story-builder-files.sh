#!/bin/bash

# Generate a csv file with references to all of the story builder files in cfm-shared
# You should pipe the output to a file, e.g.
# ./find-story-builder-files.sh > story-builder-files.csv

# The files to be analyzed were downloaded with
# aws s3 cp --recursive s3://models-resources/cfm-shared/ .
# That is a lot of files so will take a couple of hours download

echo "id, url, V3 Main, V2"

# This command will take a long time to run. It should be streaming out the results though
# so you can monitor the output to see progress.
grep -rl "story-builder" /Users/scytacki/Development/cfm-shared/ | while read -r file; do
    id=$(basename "$(dirname "$file")")
    echo \
      "${id},"\
      "https://cfm-shared.concord.org/${id}/file.json"\
      "https://codap3.concord.org/branch/main/#shared=https%3A%2F%2Fcfm-shared.concord.org%2F${id}%2Ffile.json,"\
      "https://codap.concord.org/app/static/dg/en/cert/index.html#shared=https%3A%2F%2Fcfm-shared.concord.org%2F${id}%2Ffile.json"
done
