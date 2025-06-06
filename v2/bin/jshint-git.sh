#!/bin/bash
# Usage:
#   1.  cd to the top-level dg directory (where the Makefile lives)
#   2a. Type bin/jshint-git.sh
#       or
#   2b. Type make jshint-git

TMP_SCRIPT_NAME=myjshint-git.sh

# Use git status to get the list of added/modified files.
# Then use sed to convert the output of git status to a shell script
# that runs jslint-echo.sh on each added/modified file.
git status | sed -n -e 's/^# Changes.*/echo \"&  (staged)\"/p' \
                    -e 's/^# Changed.*/echo \"& (unstaged)\"/p' \
                    -e 's/^# Untracked.*/echo \"& (unversioned)\"/p' \
                    -e 's/\(#[[:space:]]*\)\([^:]*\)$/bin\/jshint-echo.sh \2/' \
                    -e 's/#[[:space:]]*//' \
                    -e 's/\/libraries\/.*//' \
                    -e 's/deleted:.*//' \
                    -e 's/new file:/bin\/jshint-echo.sh/' \
                    -e 's/modified:/bin\/jshint-echo.sh/' \
                    -e 's/renamed:\(.*\)->\(.*\)$/bin\/jshint-echo.sh \2/' \
                    -e '/\.js$/p' \
                    > $TMP_SCRIPT_NAME

# Make the script we just created executable
chmod +x $TMP_SCRIPT_NAME

# Run the script
sh $TMP_SCRIPT_NAME

# Delete the script
rm $TMP_SCRIPT_NAME



exit $?

