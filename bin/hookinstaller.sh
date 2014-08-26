#!/bin/sh
# Usage:
#	1.  cd to the top-level dg directory (where the Makefile lives)
#	2a. Type bin/deployhooks.sh filename
#		or
#	2b. Type make deployhooks
#
#Links hooks stored in accessories/hooks into .git/hooks

PROGNAME=`basename $0`
DIRNAME=`dirname $0`

GITROOT=$DIRNAME/..
PRECOMMITHOOK=$GITROOT/.git/hooks/pre-commit


rm -f $PRECOMMITHOOK

ln $GITROOT/accessories/hooks/precommit $PRECOMMITHOOK
