#!/bin/bash
# Usage:
#   1.  cd to the top-level dg directory (where the Makefile lives)
#   2a. Type bin/jshint-hook.sh
#       or
#   2b. Type make jshint-hook

files=$(git diff --cached --name-only --diff-filter=ACMR -- *.js **/*.js)
pass=true


if [ "$files" != "" ]; then
    for file in ${files}; do
        result=$(jshint ${file})

        if [ "$result" != "" ]; then
            echo $result
            pass=false
        fi
    done
fi


if $pass; then
    exit 0
else
    echo ""
    echo "COMMIT FAILED:"
    echo "Some JavaScript files have JSHint errors. Please fix errors and try committing again."
    exit 1
fi
