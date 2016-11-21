#!/bin/bash
# Usage:
#   1.  cd to the top-level dg directory (where the Makefile lives)
#   2a. Type bin/jshint.sh filename
#       or
#   2b. Type make jshint

JSHINT_PATH="/usr/local/bin/jshint"

# Run jshint
$JSHINT_PATH --verbose $1
