# test-events/

Event fixtures for `aws cloudfront test-function`, consumed by `test-function.sh` (R30a).
Each fixture is a CloudFront Functions viewer-request event object. The sample mixes R28
positive paths (function returns a synthetic 200) and R29 negative paths (function returns
the request unchanged, optionally with the `/app` prefix stripped).

Add a fixture by copying one of these as a template and changing `request.uri` /
`request.method` / `request.querystring`. The script gates G3 on the aggregated
`ComputeUtilization` statistics across every fixture in this directory.
