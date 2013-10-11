#!/bin/sh
# Usage:
#   1.  cd to the top-level dg directory (where the Makefile lives)
#   2a. Type bin/jslint.sh filename
#       or
#   2b. Type make jslint

JSLINT_PATH="bin/jslint4java-2.0.5/jslint4java-2.0.5.jar"

# Note: Use /*jslint: bitwise:true */ to enable bitwise operators in files that require it
# --browser     Standard browser globals should be predefined
# --continue    Allow continue statements
# --debug       Allow debugger statements (should be disabled for production)
# --devel       Allow browser globals used for development (console, alert, etc.)
# --evil        Allow eval
# --maxerr 999  Maximum number of errors to allow
# --nomen       Allow leading/trailing underscores in identifiers
# --plusplus    Allow ++/--
# --regexp      Allow . and [^...] in RegExp literals
# --sloppy      ES5 'use strict'; pragma is not required
# --todo        Allow TODO comments
# --unparam     Allow unused parameters
# --vars        Allow multiple var statements per function
# --warnings    Show warnings (e.g. unused variables) -- To be released with 2.0.3
# --white       Ignore strict whitespace rules
JSLINT_OPTIONS="--browser --continue --debug --devel --evil --maxerr 999 --nomen --plusplus --regexp --sloppy --todo --unparam --vars --warnings --white"

# --predef     The names of predefined global variables
JSLINT_DEFINITIONS="--predef DG,$,SC,sc_require,sc_super,static_url,YES,NO,pv,window,Raphael,equals,module,ok,same,start,stop,test"

# Use sed to
# -- convert "for (var i..." to "var i; "for (i..."
# -- convert "// fallthrough intentional" to "break;"
# -- convert "Raphael(...)" to "new Raphael(...)"
sed -e 's/\(.*\)for\(.*\)var\([[:space:]][[:space:]]*\)\([a-z][[:alnum:]_]*\)\(.*\)/var \4; for\2\4\5/' \
    -e 's/\(.*\)\/\/ fallthrough\(.*\)/\1break;/' \
    -e 's/\(.*\)Raphael(\(.*\)/\1 new Raphael(\2/' \
    $1 > $1_js
    
# Run jslint4java and use grep to filter out unwanted results
# What we ignore:
# "Mixed spaces and tabs"
# "Expected '{' and instead saw '...'" -- This is the mandate for braces on all constructs, notably if statements
# "Unexpected 'in' -- See http://matthewkastor.blogspot.com/2012/09/Unexpected--in---Compare-with-undefined--or-use-the-hasOwnProperty-method-instead.html
# "Unexpected ','" -- This is the trailing comma in property lists, e.g. { a, b, c, }
java -jar $JSLINT_PATH $JSLINT_OPTIONS $JSLINT_DEFINITIONS $1_js | \
    grep -v -E "Mixed spaces and tabs|Expected '{'|Unexpected 'in'|Unexpected '.'|Empty block|Don't declare variables in a loop|Cannot read property \"line\" from undefined"

# Remove our temporary file
rm $1_js
