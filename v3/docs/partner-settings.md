# Partner settings

A partner setting configures one partner's branded CODAP: a logo, a name, a terms
link, a documents list, or a feature to hide. Only a partner config sets them.
The URL, saved documents and Concord's server config never do, and CODAP never
saves them into a document. Without a partner config every setting is unset and
CODAP behaves as it does for everyone else.

Partner settings are separate from [feature flags](feature-flags.md), which gate
in-development features and expire. A partner setting never expires.

Everything lives in `src/models/partner-settings/`.

## Types

Each entry in the registry (`partner-settings-registry.ts`) has a `type`:

| Type        | Value in a partner config                                     |
| ----------- | ------------------------------------------------------------- |
| `boolean`   | JSON `true` or `false`                                        |
| `string`    | text; empty or whitespace-only counts as not set              |
| `url`       | a link starting `https://` that parses, has no user name or password, and that jQuery can't treat as JSONP |
| `image`     | `{ "file": "<name>.png", "alt": "<text>" }`: a plain file name (a letter or digit first, then letters, digits, `_` or `-`) ending png, jpg, jpeg, gif or webp, and alt text that isn't blank |
| `documents` | the cloud-file-manager read-only list: every item has a name that isn't blank, every document a `url` that passes the `url` rule, every folder inline `children` only; at most 10 folder levels deep. An item that fails is dropped on its own, and a list left empty counts as not set |

No text value (a `string`, alt text, a document's name or description) may contain
`<` or `>`.

## Validation

Values are validated when the config is applied (`partner-setting-values.ts`). An
invalid value is dropped on its own and the rest apply. Names that aren't partner
settings, feature flag names included, are ignored. The rules for text, links,
the logo file name and the documents list exist because anyone with a Concord
portal login can write a partner config.

Text can't contain `<` or `>` because some of it reaches HTML: the
cloud-file-manager shows a document's name, unescaped, in an alert when the
document fails to load. Render partner text as text anyway.

The documents rules follow from how the cloud-file-manager's read-only provider
(`readonly-provider.js`) reads a list. Pass the list to it as the `json` option,
never `src`: with `src` the provider resolves relative links against a base URL,
and the rules here assume links are used exactly as written.

- A list that isn't an array is read as the provider's older
  `{ filename: contents }` format, with inline content, so it is dropped.
- The provider loads an item from `url` or, failing that, `location`. Only `url`
  is checked, so `location` is dropped, along with inline `content`.
- A folder with a `url` and no `children` has its contents fetched from that link
  and used unchecked, so folders keep inline `children` only.
- A folder with neither `children` nor `url` leaves the list loading forever, and
  a document with neither `url` nor `content` makes the provider look itself up
  again forever, so both are dropped.
- The provider walks folders recursively and overflows the stack a few thousand
  levels down, hence the 10-level limit.
- Any `type` other than `"folder"` passes through as given, so documents are
  rebuilt without one.

A folder whose items are all dropped stays, empty: an author may make an empty
folder on purpose. Text values are kept exactly as written; only the check for
blank text ignores whitespace.

Give every document a distinct name. The cloud-file-manager reopens a read-only
document after a reload by its name, so with two documents of the same name a
reload can open the wrong one, and a name containing `:` or `%` may not reopen
at all.

## Reading a setting

```tsx
{!getPartnerSetting("hidePlugins") && <PluginsButton />}
const logo = getPartnerSetting("partnerLogo")
```

`getPartnerSetting` returns the value typed for the setting, or `undefined` when
the partner config doesn't set it. Reads are observable.

Partner settings are fixed when CODAP starts: CODAP must apply the partner config
once, with `partnerSettings.setSettings`, before it renders. So a setting can be
read once at setup, such as when the cloud-file-manager is initialized. Never
read one at module scope: modules load before the config is applied, so a
module-scope read always finds the setting unset. `setSettings` replaces every
value on each call; tests use it to set and clear them.

## Adding a setting

Add its registry entry with a `type`, and add it to the expected list in
`partner-settings-registry.test.ts`. That test exists because a partner config
naming a setting this build doesn't know is dropped silently, so renaming or
retyping a setting has to be deliberate. A new `type` also needs a value type
and a validator in `partner-setting-values.ts`; the validator map is typed so
that a type without one doesn't compile. The type names (`boolean`, `string`,
`url`, `image`, `documents`) are part of what partner config authors see, so
treat them like setting names.

## Not built yet

- Loading a partner config. Until it is, nothing calls `setSettings` outside
  tests.
- Limits on the length of partner text values or the size of a partner documents
  list.
