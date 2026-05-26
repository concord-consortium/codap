# CloudFront Functions

This folder holds checked-in source for CloudFront Functions used by CODAP. The
first such function — [`v2-v3-redirect/`](./v2-v3-redirect/) — handles the
V2 → V3 redirect described in [CODAP-1323](https://concord-consortium.atlassian.net/browse/CODAP-1323).

Other existing CloudFront Functions (`StripCodapResourcesPrefix`,
TP-Sampler-related rewrites) currently live only in the AWS console; they may be
brought into this folder in future stories so all CloudFront Function source is
reviewable in git.
