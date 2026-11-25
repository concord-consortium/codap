# Feature flags

A feature flag gates an in-development feature so it can be shown to a limited
audience before general availability, graduated without a code change, and turned
off in a hurry if it misbehaves.

CODAP has two kinds of flag: **pilot flags**, described in most of this page, and
**partner flags**, per-partner settings described in [Partner flags](#partner-flags).

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

An owner name enables every flag that project owns, so a pilot for a whole
project needs one token rather than a list:

```
?features=MappingTime                        enable every MappingTime flag
?features=-MappingTime                       disable every MappingTime flag
?features=MappingTime,-legendLogarithmic     the whole group except one
```

A token is matched as a flag name first and an owner name second, so a flag name
always wins on the (convention-avoided) chance the two collide. The document a
pilot user saves records the individual flags the group expanded to, not the
owner name, so the grant survives later changes to the project's flag set.

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
- An explicit `?features=-foo` turns the feature off for the session — the URL
  beats a document grant (resolution rule 2 over rule 4) — but the save path only
  ever adds grants, so `-foo` does **not** remove the grant already stored in the
  document. Reopen without it and the feature is back. Disabling is session-scoped,
  and the document may still contain artifacts of the feature regardless.
- So a persisted grant is a one-way door: the exits that remove it are the server
  kill switch and eventual deletion of the flag. A URL `-foo` is a session escape,
  not an exit — it leaves the grant in place.
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

## Partner flags

A partner flag is a setting for one partner's branded CODAP: a logo, a name, a
terms link, a documents list, or a feature to hide. It is declared in the same
registry with `kind: "partner"` and a `type` instead of `owner` and `expires`.
An entry with both or neither fails to compile. Partner flags never expire.

| Type        | Value in a partner config                                     |
| ----------- | ------------------------------------------------------------- |
| `boolean`   | JSON `true` or `false`                                        |
| `string`    | text; empty or whitespace-only counts as not set              |
| `url`       | a link starting `https://` that parses and that jQuery can't treat as JSONP |
| `image`     | `{ "file": "<name>.png", "alt": "<text>" }`: a plain file name (a letter or digit first, then letters, digits, `_` or `-`) ending png, jpg, jpeg, gif or webp, and alt text that isn't blank |
| `documents` | the cloud-file-manager read-only list: every item has a name that isn't blank, every document a `url` that passes the `url` rule, every folder inline `children` only; at most 10 folder levels deep. An item that fails is dropped on its own, and a list left empty counts as not set |

Only a partner config sets them. The `features` URL parameter, owner tokens, the
server config and saved documents all ignore partner flag names, and saving a
document never records one. A partner config can't set a pilot flag; pilot flags
still reach a partner link through `?features=`.

Values are validated when the config is applied
(`partner-flag-values.ts`). An invalid value is dropped on its own and the rest
apply. The rules for links, the logo file name and the documents list exist
because anyone with a Concord portal login can write a partner config.

Read a boolean partner flag with `isFeatureEnabled`, and any other with
`getFeatureValue`, which returns `undefined` when the flag is unset:

```tsx
{!isFeatureEnabled("hidePlugins") && <PluginsButton />}
const logo = getFeatureValue("partnerLogo")
```

Calling `isFeatureEnabled` on a value flag, or `getFeatureValue` on a boolean
one, is a compile error.

Partner flags are fixed when CODAP starts. The partner config is applied once,
before CODAP renders, so unlike a pilot flag, a partner flag doesn't change
after a late server directive, and it can be read once when CODAP sets up, such
as when the cloud-file-manager is initialized. Never read one at module scope:
modules load before the config is applied, so a module-scope read always finds
the flag unset. The manager's `setPartnerFlags` replaces all partner values on
each call; tests use it to set and clear them.

Renaming or retyping a partner flag must be deliberate: a test compares the
partner flags against a list written in the test, because a config naming a flag
this build doesn't know is dropped silently.

## Not built yet

- Caching server `off` directives in `localStorage` so the kill switch survives a
  failed fetch.
- A lint rule enforcing the affordance rule.
- Round-tripping `featureFlags` through v2 documents. Saving as v2 is a developer
  debug option (`debug=saveAsV2`), so v2 saves currently drop grants.
- A developer escape hatch for overriding a server `off` locally. (Overriding a
  document grant already works: `?features=-foo` disables it for the session.)
- Exposing flags to plugins through the Data Interactive API.
