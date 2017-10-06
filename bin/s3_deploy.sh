#!/bin/sh
SRC_DIR='dist/travis'
DISTRIBUTION_ID='E6OL76123FRO6'

# this will deploy the current public folder to a subfolder in the s3 bucket
# the subfolder is the name of the TRAVIS_BRANCH
if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
	echo "skipping deploy to S3: this is a pull request"
	exit 0
fi

if [ "$TRAVIS_BRANCH" = 'master' ]; then
  mv $SRC_DIR _site
  INVAL_PATH="/index.html"
else
  # the 2> is to prevent error messages when no match is found
  CURRENT_TAG=`git describe --tags --exact-match $TRAVIS_COMMIT 2> /dev/null`
  if [ "$TRAVIS_BRANCH" = "$CURRENT_TAG" ]; then
    echo "skipping deploy to S3: this is a release tag"
    exit 0
  else
    # this is a branch build
    mkdir -p _site/branch
    DEPLOY_DIR=branch/$TRAVIS_BRANCH
    INVAL_PATH="/branch/$TRAVIS_BRANCH/index.html"
  fi
  mv $SRC_DIR _site/$DEPLOY_DIR
  export DEPLOY_DIR
fi
s3_website push --site _site
# explicit CloudFront invalidation to workaround s3_website gem invalidation bug
# with origin path (https://github.com/laurilehmijoki/s3_website/issues/207).
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths $INVAL_PATH
