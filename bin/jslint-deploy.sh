#!/bin/sh
# Usage:
#	1.  cd to the top-level dg directory (where the Makefile lives)
#	2a. Type bin/jslint-deploy.sh filename
#		or
#	2b. Type make jslint-deploy

# Calls jslint.sh to perform the bulk of the work, then uses grep to filter out additional messages.
# Messages we ignore as part of this pre-deployment check:
# "Expected '===' and instead saw '=='"
# "Expected '!==' and instead saw '!='"
# "Function statements should not be placed in blocks"
# "Don't make functions within a loop"
bin/jslint.sh $1 | grep -v -E "Expected '==='|Expected '!=='|Function statements should not be placed in blocks|Don't make functions within a loop"
