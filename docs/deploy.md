# Deployment

S3 deployment is handled by GitHub Actions. Pushes are deployed to `models-resources/codap-dev/` by the `s3-deploy` job in [`ci.yml`](../.github/workflows/ci.yml), and are served from https://codap-dev.concord.org/.

This covers development and branch builds only. Production v2 releases are assembled and copied to `codap-server.concord.org` by hand. See [formal-build-process.md](formal-build-process.md) for that process.

## AWS Access

The GitHub actions in this project are allowed to update files in S3 using OIDC. An IAM role has been created in AWS with a trust policy that allows GitHub actions in this specific repository to assume this IAM role. The IAM role has a `RepoName` tag and a managed policy that uses this tag to give the role's users permission to update files in `models-resources/[RepoName]`.

This repository is named `codap`, but v2 deploys to `models-resources/codap-dev/` and v3 deploys to `models-resources/codap3/`, so the shared managed policy alone does not grant the access either one needs. The role therefore carries two additional inline policies, `codap-dev-deploy` and `codap3-deploy`, that grant the same S3 permissions on those two prefixes.

The role is shared with the v3 deploys on the `main` branch. Its trust policy allows any branch of this repository, so one role serves both.

See [deploy-setup.md in starter-projects](https://github.com/concord-consortium/starter-projects/blob/main/doc/deploy-setup.md) for how the AWS side is set up.
