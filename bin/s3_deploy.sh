#!/bin/bash

# Follow instructions in this guide to setup an S3 & Cloudfront distribution:
# https://docs.google.com/document/d/1EacCSUhaHXaL8ll8xjcd4svyguEO-ipf5aF980-_q8E

# Typically this is the Project name.
# The trailing slash is important
# Can be set to an empty string for working at the top level of the bucket
S3_BUCKET_PREFIX='codap-dev/'
# AWS CloudFront distribution domain
DISTRIBUTION_DOMAIN='codap-dev.concord.org'
# name of branch to deploy to root of site
ROOT_BRANCH='production'
# Bucket to deploy to, typically this is 'model-resources', but some projects
# have their own buckets
S3_BUCKET='models-resources'
# location of built files
SRC_DIR='dist/ci'

# exit when any command fails
set -e

# keep track of the last executed command
trap 'last_command=$current_command; current_command=$BASH_COMMAND' DEBUG
# echo an error message before exiting
trap 'echo "\"${last_command}\" command exited with code $?."' EXIT

# extract current TAG if present
# the 2> is to prevent error messages when no match is found
# the || echo prevents script exit when it doesn't match
CURRENT_TAG=`git describe --tags --exact-match $GITHUB_SHA 2> /dev/null || echo ''`

# Extract the branch or tag name from the GITHUB_REF
# it should either be: refs/head/branch-name or
# or refs/tags/v1.2.3
# since we ought to know if this is a branch or tag based on the ref
# we could simplify the CURRENT_TAG approach above
BRANCH_OR_TAG=${GITHUB_REF#refs/*/}
echo branch or tag: $BRANCH_OR_TAG

# strip PT ID from branch name for branch builds
DEPLOY_DIR_NAME=$BRANCH_OR_TAG
PT_PREFIX_REGEX="^([0-9]{8,}-)(.+)$"
PT_SUFFIX_REGEX="^(.+)(-[0-9]{8,})$"
if [[ $DEPLOY_DIR_NAME =~ $PT_PREFIX_REGEX ]]; then
  DEPLOY_DIR_NAME=${BASH_REMATCH[2]}
fi
if [[ $DEPLOY_DIR_NAME =~ $PT_SUFFIX_REGEX ]]; then
  DEPLOY_DIR_NAME=${BASH_REMATCH[1]}
fi

# tagged builds deploy to /version/TAG_NAME
if [ "$BRANCH_OR_TAG" = "$CURRENT_TAG" ]; then
  mkdir -p _site/version
  S3_DEPLOY_DIR="version/$BRANCH_OR_TAG"
  DEPLOY_DEST="_site/$S3_DEPLOY_DIR"
  # in this case we are going to deploy this code to a subfolder of version
  # So ignore everything except this folder.
  # Currently this only escapes `.`
  S3_DEPLOY_DIR_ESCAPED=$(sed 's/[.]/[&]/g;' <<<"$S3_DEPLOY_DIR")
  IGNORE_ON_SERVER="^(?!$S3_BUCKET_PREFIX$S3_DEPLOY_DIR_ESCAPED/)"

# root branch builds deploy to root of site
elif [ "$BRANCH_OR_TAG" = "$ROOT_BRANCH" ]; then
  DEPLOY_DEST="_site"
  # in this case we are going to deploy this branch to the top level
  # so we need to ignore the version and branch folders
  IGNORE_ON_SERVER="^$S3_BUCKET_PREFIX(version/|branch/)"

# branch builds deploy to /branch/BRANCH_NAME
else
  mkdir -p _site/branch
  S3_DEPLOY_DIR="branch/$DEPLOY_DIR_NAME"
  DEPLOY_DEST="_site/$S3_DEPLOY_DIR"
  # in this case we are going to deploy this code to a subfolder of branch
  # So ignore everything except this folder.
  # Currently this only escapes `.`
  S3_DEPLOY_DIR_ESCAPED=$(sed 's/[.]/[&]/g;' <<<"$S3_DEPLOY_DIR")
  IGNORE_ON_SERVER="^(?!$S3_BUCKET_PREFIX$S3_DEPLOY_DIR_ESCAPED/)"
fi

# used by s3_website.yml
export S3_BUCKET_PREFIX
export IGNORE_ON_SERVER
export DISTRIBUTION_DOMAIN
export S3_BUCKET

# copy files to destination
mv $SRC_DIR $DEPLOY_DEST

# deploy the site contents; increase memory for s3_website gem
echo Deploying "$BRANCH_OR_TAG" to "$S3_BUCKET:$S3_BUCKET_PREFIX$S3_DEPLOY_DIR"...
JAVA_TOOL_OPTIONS="-Xms1g -Xmx2g" s3_website push --site _site
