# Feature flags

A feature flag gates an in-development feature so it can be shown to a limited
audience before general availability, graduated without a code change, and turned
off in a hurry if it misbehaves.

Everything lives in `src/models/feature-flags/`.

## Using a flag

Declare it in the registry (`feature-flag-registry.ts`):

```ts
export const kFeatureFlags = {
  residualPlot: {
    description: "Residual plots on the graph",
    owner: "ESTEEM",
    added: "2026-07-22",
    expires: "2027-07-31"
  }
} as const satisfies Record<string, IFeatureFlagInfo>
```

Read it where the affordance renders:

```ts
import { isFeatureEnabled } from "../../models/feature-flags/feature-flag-manager"

{isFeatureEnabled("residualPlot") && <ResidualPlotMenuItem />}
```

The flag name is typed, so a typo is a compile error and deleting a registry entry
turns every stale call site into a compile error too. That is what makes retiring a
flag mechanical rather than archaeological.

## The affordance rule

**Gate affordances, not registrations.** A gated feature registers its tile,
adornment, or handler unconditionally; only the things a user clicks — the tool
shelf button, the menu item, the inspector control — are wrapped in
`isFeatureEnabled`. Never read a flag at module scope.

Three reasons:

- A document containing artifacts of the feature still opens when the flag is
  off, instead of degrading to `unknown-content` because someone dropped a query
  string.
- Every gate is a reactive read, so a server directive that arrives after render
  takes effect without a reload.
- It costs nothing in bundle size. Conditional registration doesn't exclude a
  module from the bundle; it only skips a few registry insertions.

`error-tester-registration.ts` conditionally registers at module scope and is
**not** the template here. `errorTester` is a developer tool, not a piloted
feature, and it stays as it is.

### When a flag needs a flag-off test

The affordance rule keeps a flag-off document loadable; it does not by itself make
the document *usable*. If a flag gates something that writes document state the
ungated app can't otherwise reach, add a test that enables the flag, modifies the
document through the gated affordance, disables the flag, and exercises what could
break.

Flags that only gate UI over state the document already models — an adornment, a
legend setting — don't need this; a flag-off document is inert rather than broken.

## Turning a flag on

### By URL — the pilot channel

```
?features=residualPlot            enable
?features=-residualPlot           disable
?features=residualPlot,-someOther comma-separated for several
```

The setting lives in the URL and nowhere else; closing the tab ends it. This is
deliberately not a sticky per-browser opt-in, so "what is this user actually
running?" always has an answer — which matters the first time a pilot teacher
files a bug report.

### By server config — general availability and the kill switch

`https://codap-resources.concord.org/config/v3-feature-flags.json`

```json
{ "residualPlot": "on" }
```

Marking a flag `on` graduates it to everyone without a release. Marking it `off`
takes it away from everyone, including people holding pilot URLs, without waiting
for a release.

The URL is fetched from `codap-resources.concord.org` directly, **not** through
`codap.concord.org/codap-resources/*`, which caches at the CloudFront edge for a
day and ignores `Cache-Control: no-cache`. A kill switch that takes 24 hours to
propagate is not a kill switch.

### By document — handing a pilot to a group

A saved document records the flags its author had enabled by URL, and grants them
to whoever opens it. A researcher can hand twelve teachers a pilot document rather
than a query string.

## Resolution order

First rule that matches wins:

1. Server config says `off` → **off**. Nothing overrides this.
2. URL parameter says on or off → **that value**.
3. Server config says `on` → **on**.
4. The open document grants it → **on**.
5. Otherwise → **off**.

In a sentence: the server can always take a feature away; short of that, the URL
decides; short of that, the server can give it to everyone; short of that, the
document can give it to you.

The asymmetry is deliberate. `off` is a kill switch and must reach every session
regardless of anyone's URL, because pilot URLs circulate beyond the people they
were sent to. `on` merely flips a default, so a user turning a
generally-available feature off for themselves is harmless — and asking a teacher
to try `?features=-newThing` is the most useful support move available once a
feature has shipped broadly.

## How document grants behave

- On save, a document's `featureFlags` become the union of what it already had and
  what this session enabled by URL.
- Flags on because of a server `on` are **never** persisted. They're on for
  everybody anyway, and recording them would bake a grant into every document
  saved during the general-availability window, resurrecting the feature for those
  documents after it's later turned off.
- An explicit `?features=-foo` does **not** strip an existing grant. Disabling is
  session-scoped, and the document may still contain artifacts of the feature.
- So grants are a one-way door. The exits are the server kill switch and eventual
  deletion of the flag.
- Unknown flag names, from any source, resolve to off and are ignored — which is
  what gives old documents a harmless afterlife once a flag is deleted.
- The union happens in the save path, not on load. Writing to the document on load
  would mark it dirty and trigger the unsaved-changes prompt on a document the
  user never touched.

## Retiring a flag

**Server `off` is a stopgap, not retirement.** It only works while the fetch
succeeds, and the fetch fails open: offline, embedded in LARA, behind a
CORS-restricted proxy, or during an S3 outage, a killed flag comes back for anyone
holding a document that grants it. A permanent `off` entry is also a comfortable
resting place for a dead feature — nobody feels pressure to delete code that's
already disabled.

Retirement is deleting the flag and its code. The `expires` date exists so someone
can be reminded when a flag is overdue.

## Not built yet

- Caching server `off` directives in `localStorage` so the kill switch survives a
  failed fetch.
- A lint rule enforcing the affordance rule.
- Round-tripping `featureFlags` through v2 documents. Saving as v2 is a developer
  debug option (`debug=saveAsV2`), so v2 saves currently drop grants.
- A developer escape hatch for overriding a server `off` locally.
- Exposing flags to plugins through the Data Interactive API.
