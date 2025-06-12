#!/bin/bash
# Usage:
#	1.  cd to the top-level dg directory (where the Makefile lives)
#	2.  Type bin/jshint-echo.sh filename

# Echo the file name before calling jslint.sh
echo $1
bin/jshint.sh $1
