#!/bin/bash
# extract-hash.sh

HASH=$(ls /app/codap/static/dg/ko/ | head -n 1)
if [ -z "$HASH" ]; then
  echo "Error: No hash folder found!" >&2
  exit 1
fi

echo $HASH
