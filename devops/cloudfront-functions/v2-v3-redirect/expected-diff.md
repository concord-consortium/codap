# Expected source-vs-clone config differences (R26a allowlist)

This file is the **machine-readable allowlist** that `verify-clone.sh` enforces (SE-J2).
Each JSON-path entry describes one difference between the production distribution
(`E3H9X49AG3GYSO`) and the modified clone. `verify-clone.sh` computes the structural diff
between the two normalized configs and `exits non-zero on any difference not listed here`.

The script reads only the `### Allowlist (machine-readable)` section's fenced block; the
prose around it is for the human reviewer who signs G-criteria.

## Allowlist (machine-readable)

```text
# Format: one JSON-path per line; `#` starts a comment. Trailing comments OK.
# Paths are jq-style. A leading `+` means "permitted to be present on the clone but not
# on prod" (the clone-only carve-outs / /v3 behaviors). A leading `~` means "value differs
# on the clone in a permitted way" (the modified /app, /app/*, /releases/* behaviors).
# A leading `-` means "permitted to be absent on the clone" (none today; reserved).

# 1. Top-level identity fields that MUST differ on a clone -- not security-relevant.
~ .CallerReference
~ .Aliases.Items
~ .Aliases.Quantity
~ .Comment

# 2. Existing /app, /app/*, /releases/* behaviors: origin swapped + function attached
#    (+ optionally a response-headers policy when RHP_REQUIRED=true). Each behavior is
#    listed explicitly so an unintended change to any OTHER behavior fails the gate.
~ .CacheBehaviors.Items[?(@.PathPattern=='/app')].TargetOriginId
~ .CacheBehaviors.Items[?(@.PathPattern=='/app/*')].TargetOriginId
~ .CacheBehaviors.Items[?(@.PathPattern=='/releases/*')].TargetOriginId
~ .CacheBehaviors.Items[?(@.PathPattern=='/app')].FunctionAssociations
~ .CacheBehaviors.Items[?(@.PathPattern=='/app/*')].FunctionAssociations
~ .CacheBehaviors.Items[?(@.PathPattern=='/releases/*')].FunctionAssociations
# Prod's FunctionAssociations is `{Quantity: 0}` (no Items key); the clone gains the
# Items array when the function is attached. The matcher reports the Quantity bump as
# `~` (covered above) but the Items addition as `+`, which requires its own entry.
+ .CacheBehaviors.Items[?(@.PathPattern=='/app')].FunctionAssociations.Items
+ .CacheBehaviors.Items[?(@.PathPattern=='/app/*')].FunctionAssociations.Items
+ .CacheBehaviors.Items[?(@.PathPattern=='/releases/*')].FunctionAssociations.Items

# ForwardedValues.Headers cleared on V3-pointing behaviors. Prod /app, /app/*,
# /releases/* forward Host (Items=["*"]) to the V2 custom origin; on the clone those
# behaviors point at S3-website, which uses the request Host for bucket resolution --
# so the clone clears Headers (Quantity 1->0, Items ["*"]->absent) and CloudFront
# falls back to the origin DomainName as Host. See modify-clone.sh. The `~` entries
# cover the Quantity change via prefix; the `-` entries cover the Items removal
# (CloudFront strips Items entirely from the response when Quantity=0).
~ .CacheBehaviors.Items[?(@.PathPattern=='/app')].ForwardedValues.Headers
~ .CacheBehaviors.Items[?(@.PathPattern=='/app/*')].ForwardedValues.Headers
~ .CacheBehaviors.Items[?(@.PathPattern=='/releases/*')].ForwardedValues.Headers
- .CacheBehaviors.Items[?(@.PathPattern=='/app')].ForwardedValues.Headers.Items
- .CacheBehaviors.Items[?(@.PathPattern=='/app/*')].ForwardedValues.Headers.Items
- .CacheBehaviors.Items[?(@.PathPattern=='/releases/*')].ForwardedValues.Headers.Items
~ .CacheBehaviors.Items[?(@.PathPattern=='/app')].ResponseHeadersPolicyId
~ .CacheBehaviors.Items[?(@.PathPattern=='/app/*')].ResponseHeadersPolicyId
~ .CacheBehaviors.Items[?(@.PathPattern=='/releases/*')].ResponseHeadersPolicyId

# 3. New behaviors added by modify-clone.sh (head-of-array precedence per GR1).
+ .CacheBehaviors.Items[?(@.PathPattern=='/releases/.gapikey')]
+ .CacheBehaviors.Items[?(@.PathPattern=='/releases/staging')]
+ .CacheBehaviors.Items[?(@.PathPattern=='/releases/staging/*')]
+ .CacheBehaviors.Items[?(@.PathPattern=='/releases/zips/*')]
+ .CacheBehaviors.Items[?(@.PathPattern=='/releases/var/*')]
+ .CacheBehaviors.Items[?(@.PathPattern=='/releases/apple-touch-icon.png')]
+ .CacheBehaviors.Items[?(@.PathPattern=='/v3')]
+ .CacheBehaviors.Items[?(@.PathPattern=='/v3/*')]

# 4. CacheBehaviors.Quantity changes with the new behaviors.
~ .CacheBehaviors.Quantity

# 5. Cache policy substitution on sensor-interactive/* and multidata-plugin/*.
#    Prod references CachePolicyId=a1cf85e6-... (S3-CORS-1), which is already at the
#    AWS-default per-policy quota of 100 distinct distributions. The clone substitutes
#    CachePolicyId=d41b1d60-... (S3-CORS) -- byte-equivalent caching config (same TTLs,
#    cache key, headers/cookies/querystring forwarding); only Name and Comment differ.
#    See clone-distribution notes.
~ .CacheBehaviors.Items[?(@.PathPattern=='sensor-interactive/*')].CachePolicyId
~ .CacheBehaviors.Items[?(@.PathPattern=='multidata-plugin/*')].CachePolicyId

# 5. Per CloudFront API, every update-distribution returns new ETag/LastModifiedTime --
#    these are wrappers around DistributionConfig and are not part of it, so they should
#    not appear in the diff. Listed here for documentation only.
# (ignored -- not part of DistributionConfig)
```

## Notes for the human reviewer (G-criteria sign-off)

- **Origin swap on `/app`, `/app/*`, `/releases/*`**: from V2 origin to
  `S3-Website-models-resources-codap3`. After the flip, V3 serves these paths from
  `codap3/` (post-`/app`-strip per R1a).
- **Function attachment** on those same three behaviors plus the new `/v3` and `/v3/*`
  behaviors. The viewer-request function is the redirect function published in
  Phase 4.
- **New carve-outs** (`/releases/.gapikey`, `/releases/staging[/*]`, `/releases/zips/*`,
  `/releases/var/*`, `/releases/apple-touch-icon.png`) route to the **V2 origin** and have
  **no function** attached. These appear at higher precedence than `/releases/*` (GR1).
- **`/v3` and `/v3/*`** route to V3 S3 with the function attached. The function always
  redirects, so the origin is never reached.
- **Response-headers policy** -- only present if `RHP_REQUIRED=true` (DO-I1). When
  `false`, the clone inherits prod's policy attachment (or has no policy if prod had none).
- **Cache policy substitution on `sensor-interactive/*` and `multidata-plugin/*`** --
  prod references custom cache policy `S3-CORS-1` (`a1cf85e6-b5ea-4ed9-80e7-1cf3cdc8ecaa`),
  which is already at the AWS-default per-policy quota of 100 distinct distributions.
  The clone uses the structurally-identical `S3-CORS` (`d41b1d60-f629-4499-93ba-a45153f58bbc`)
  -- same TTL bounds, cache key, and forwarded headers/cookies/querystrings; only Name and
  Comment differ. Caching behavior on these plugin-asset paths is unchanged.

Any other difference -- a different policy id, an unexpected pattern, a touched origin,
a change to the default cache behavior, an alteration to `/v2`, `/v2/*`, `/~user/*`,
`/sage*`, `/codap-resources/*` -- is **NOT** allowlisted and blocks the flip.
