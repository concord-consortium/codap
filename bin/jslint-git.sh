#!/bin/sh
# Usage:
#   1.  cd to the top-level dg directory (where the Makefile lives)
#   2a. Type bin/jslint-git.sh
#       or
#   2b. Type make jslint-git

TMP_SCRIPT_NAME=myjslint-git.sh

# Use git status to get the list of added/modified files.
# Then use sed to convert the output of git status to a shell script
# that runs jslint-echo.sh on each added/modified file.
git status | sed -n -e 's/^# Changes.*/echo \"&  (staged)\"/p' \
                    -e 's/^# Changed.*/echo \"& (unstaged)\"/p' \
                    -e 's/^# Untracked.*/echo \"& (unversioned)\"/p' \
                    -e 's/\(#[[:space:]]*\)\([^:]*\)$/bin\/jslint-echo.sh \2/' \
                    -e 's/#[[:space:]]*//' \
                    -e 's/\/libraries\/.*//' \
                    -e 's/deleted:.*//' \
                    -e 's/new file:/bin\/jslint-echo.sh/' \
                    -e 's/modified:/bin\/jslint-echo.sh/' \
                    -e 's/renamed:\(.*\)->\(.*\)$/bin\/jslint-echo.sh \2/' \
                    -e '/\.js$/p' \
                    > $TMP_SCRIPT_NAME

# Make the script we just created executable
chmod +x $TMP_SCRIPT_NAME

# Run the script
sh $TMP_SCRIPT_NAME

# Delete the script
rm $TMP_SCRIPT_NAME
