#!/bin/bash

# This script runs the npm script `validate` over a subset of files.
# The output of each validate is sent to the console.
# The status of validation (pass/fail) will be saved into a results.csv file

# The files to be analyzed were downloaded with
# aws s3 cp --recursive s3://models-resources/cfm-shared/ .
# That is a lot of files so will take a couple of hours download

# It uses basic shell path filtering to get the list of folders
# to pass to the find command. It is currently set to `/1*` to
# get a subset of all of the cfm-shared files.

# This script ignores files that:
# - have `"appName": "CFM`
# - do not have `"appName": "DG"`
# Those files are either wrapped CODAP files, non CODAP files, or
# CODAP data context only files

find /Users/scytacki/Development/cfm-shared/1* -type f -print0 | \
xargs -0 -n1 -I {} bash -c '
if grep -E -q "\"appName\": ?\"DG\"" "$1" && ! grep -E -q "\"appName\": ?\"CFM" "$1"; then
    if npm run validate "$1"; then
        echo "$1,pass" >> results.csv;
    else
        echo "$1,fail" >> results.csv;
    fi
fi' _ {}
