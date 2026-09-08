# Deployment

S3 deployment is handled by GitHub Actions. Pushes are deployed to `models-resources/codap3/` by the `s3-deploy` job in [`v3.yml`](../../.github/workflows/v3.yml).

A released version is promoted to the top-level `index.html` by [`release-v3-production.yml`](../../.github/workflows/release-v3-production.yml) via `workflow_dispatch`. The same promotion is available for the staging, beta, and ai4vs entry points via [`release-v3-staging.yml`](../../.github/workflows/release-v3-staging.yml), [`release-v3-beta.yml`](../../.github/workflows/release-v3-beta.yml), and [`release-v3-ai4vs.yml`](../../.github/workflows/release-v3-ai4vs.yml).

See the Deployment section of the [README](../README.md) for the full release process.

## AWS Access

The GitHub actions in this project are allowed to update files in S3 using OIDC. An IAM role has been created in AWS with a trust policy that allows GitHub actions in this specific repository to assume this IAM role. The IAM role has a `RepoName` tag and a managed policy that uses this tag to give the role's users permission to update files in `models-resources/[RepoName]`.

This repository is named `codap` but deploys to `models-resources/codap3/`, so the shared managed policy alone does not grant the access the deploys need. The role therefore carries an additional inline policy, `codap3-deploy`, that grants the same S3 permissions on `models-resources/codap3/*`.

The role is set up to serve the CODAP v2 deploys on the `master` branch as well: its trust policy allows any branch of this repository, and it carries a second inline policy, `codap-dev-deploy`, covering the `models-resources/codap-dev/` prefix that v2 uses.

See [deploy-setup.md in starter-projects](https://github.com/concord-consortium/starter-projects/blob/main/doc/deploy-setup.md) for how the AWS side is set up.
