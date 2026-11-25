# Partner flags in CODAP's feature-flag registry

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1758
**Repo**: https://github.com/concord-consortium/codap
**Implementation Spec**: [implementation.md](implementation.md)
**Status**: **In Development**

## Overview

CODAP's feature flags are on/off pilots that expire. This story adds a second kind, partner flags, which never expire, can hold values (text, a link, an image, a document list), and can be set only by a partner config. It defines all ten of them and validates their values, so later stories can brand CODAP per partner without touching regular CODAP.

## Project Owner Overview

Partner-branded CODAP (seven stories in Sprint 31) lets Concord show a publisher a CODAP with their logo, name, terms link and documents, and with some features hidden, all driven by a config file rather than code. This first story builds the foundation: the settings themselves, the rules for what a valid value is, and the guarantee that none of these settings can be switched on any other way (a link, a saved document or Concord's global feature config). Nothing a user sees changes in this story; CODAP-1759 loads the configs and CODAP-1762 and CODAP-1763 use the settings.

The safety rules matter because anyone with a Concord portal login can create a config. Every link in a config is checked so it can't be turned into a script load, and the logo must be a plain raster image file. A bad value is dropped on its own, and the rest of the config still works.

## Background

Sources: CODAP-1758 (description and AI instructions), the stream plan (`codap-whitelabel/plan.md`), the stream requirements (`codap-whitelabel/requirements.md`, sections 2 and 3.1, whose ids R-X-n and R-1758-n are used below) and the decision record (decisions 3 to 5, 21, 26 and 39). Where they differ, Jira wins.

CODAP v3's feature-flag system lives in `v3/src/models/feature-flags/`:

- `feature-flag-registry.ts`: `kFeatureFlags`, a `const` object of entries `{ description, owner, added, expires }` checked with `satisfies Record<string, IFeatureFlagInfo>`; `FeatureFlagName`, `isFeatureFlagName`, `kFeatureFlagNames`, `isFeatureFlagOwner`, `flagsForOwner`. Seven pilot flags today (`residualPlot` is a deprecated sample kept for tests).
- `feature-flag-manager.ts`: `FeatureFlagManager` with three sources: `urlFlags` (the `features` URL parameter, including owner-token expansion via `flagsForOwner`), `serverFlags` (`setServerConfig`, from the global config) and `documentFlags` (`setDocumentFlags`, from the open document's `content.featureFlags`, pushed by an autorun in `app-state.ts`). `isFeatureEnabled(name)` resolves: server off, then URL, then server on, then document. `urlEnabledFlags` feeds the save path.
- `feature-flag-config.ts`: `validateFeatureFlagConfig` keeps registered names with `"on"`/`"off"` values; `fetchFeatureFlagConfig` fails open.
- `feature-flag-document.ts`: `addFeatureFlagGrants` unions `urlEnabledFlags` into a saved v3 document's `content.featureFlags`.
- `v3/docs/feature-flags.md`: the developer documentation.

Every source today accepts any registered name via `isFeatureFlagName`. Adding partner flags to the same registry without changing that would let `?features=hideShare`, a document's `featureFlags`, or the global config turn them on, which this story forbids.

The document-list rules come from how cloud-file-manager (CFM) 2.3's read-only provider (`readonly-provider.js`) treats a list, checked in the installed package:

- A list that isn't an array is read in the older `{ filename: contents }` format, with inline content.
- An item's link is `item.url || item.location`. A folder with no `children` but a `url` is fetched with `$.ajax({ dataType: "json" })` and its response becomes the folder's contents, unchecked.
- A folder with neither `children` nor `url` leaves a promise that never resolves, so the whole list never loads.
- A file with neither `content` nor `url` makes `load()` look itself up by name and call `load()` again on the same item, forever.
- `type` passes through as given; any value but `"folder"` is treated as a file.

The link rule comes from jQuery 3.7.1 (the version CODAP installs): `$.ajax` with `dataType: "json"` switches to a `<script>` load when the URL matches `rjsonp = /(=)\?(?=&|$)|\?\?/`, tested against the whole raw URL string, fragment included. A throwaway jsdom run against the installed jQuery confirmed it: `https://example.com/x.json#=?`, `...?cb=?`, `...??` and `...?a=1#x=?&y` all get data types `script,json`; `https://example.com/x.json` and `https://example.org/a?b=?c` stay `json`.

## Requirements

Ids match the stream requirements. Lettered items are this spec's additions within the story's scope.

### Registry

- **R-1758-1.** The feature-flag registry holds two kinds of entry: a pilot flag (today's shape, with `expires`) and a partner flag (`kind: "partner"` and a `type`, no `expires`). Every entry is exactly one kind; an entry with both or neither is a TypeScript compile error. Partner flags never expire. *Verify:* a throwaway change adding an entry with both, and one with neither, fails `npm run build:tsc`. (Confirmed during spec writing with a sketch of the type: both cases fail to compile.)
- **R-1758-2.** All ten partner flags are defined, with these types:

  | Flag | Type | Valid value |
  | --- | --- | --- |
  | `partnerName` | `string` | text |
  | `partnerLogo` | `image` | `{ "file": "<name>", "alt": "<text>" }` |
  | `partnerTermsUrl` | `url` | an absolute `https:` link |
  | `partnerDocumentsLabel` | `string` | text |
  | `partnerDocuments` | `documents` | a list of document and folder items |
  | `partnerStorageDemoLabel` | `string` | the demo storage tab's label; empty means off |
  | `hideGoogleDrive` | `boolean` | JSON `true` or `false` |
  | `hideLocalFile` | `boolean` | JSON `true` or `false` |
  | `hideShare` | `boolean` | JSON `true` or `false` |
  | `hidePlugins` | `boolean` | JSON `true` or `false` |

  The type names are exactly `boolean`, `string`, `url`, `image` and `documents`, the names CODAP-1759's `partner-flags.json` manifest publishes (R-X-15). No test-only flag is added to the production registry; tests use fixtures.
- **R-1758-2a.** Reading is typed. `isFeatureEnabled(name)` accepts pilot flags and boolean partner flags, and is a compile error for a value flag (`string`, `url`, `image`, `documents`). A new `getFeatureValue(name)` reads a value flag and returns its validated value, or `undefined` when unset. Both reads are reactive (MobX observable), like today's. *Verify:* a throwaway `isFeatureEnabled("partnerName")` fails `npm run build:tsc` (confirmed with the sketch); unit tests read each type.
- **R-1758-2b.** A boolean partner flag is on only when the applied partner config sets it to `true`. Nothing else (URL, server config, document) changes it.
- **R-1758-2c.** CODAP-1759 can enumerate the partner flags with their types (for the manifest) and owns no copy of the list; the registry is the single source.

### Sources

- **R-1758-3.** Partner flags are set only by a partner config (R-X-2):
  - the `features` URL parameter ignores a partner flag name, with or without `-`;
  - an owner token never expands to a partner flag;
  - the global feature config (`setServerConfig` and `validateFeatureFlagConfig`) ignores a partner flag name;
  - a document whose `featureFlags` lists a partner flag name doesn't turn it on (`setDocumentFlags` ignores it);
  - saving never adds a partner flag name to a document (`urlEnabledFlags` and `addFeatureFlagGrants` hold only pilot flags);
  - existing documents that already list one are not rewritten (decision 39).

  *Verify:* a unit test for the URL, the global config and a document, and a test that a document saved while partner flags are applied from a test fixture has no partner flag name in `featureFlags`. Owner tokens are covered by the type rather than a test: a partner entry can't declare an `owner` (`owner?: never`), so no owner name can match one, and a test of it could not fail.
- **R-1758-3a.** The feature-flag manager has one entry point for a partner config's `flags` object, which CODAP-1759 calls once at startup. Each call replaces the partner values, so tests can set and clear them. It takes the raw (unvalidated) object and applies only what passes validation, so invalid partner values can't reach the manager by any route. Names in `flags` that aren't partner flags (unknown names, pilot flag names) are ignored, so a config can't turn on a pilot flag (R-1759-12).
- **R-1758-3b.** Pilot flags keep today's sources and resolution order (R-X-3). The existing feature-flag and app-state tests pass with their assertions unchanged.

### Validation

- **R-1758-4.** Each value is checked against its flag's type. An invalid value is dropped on its own and every valid value in the same config still applies (R-X-20). Validation never throws for any JSON input, including deeply nested lists; a value that can't be validated is dropped.
  - `boolean`: JSON `true` or `false` only. Strings such as `"on"`, `"true"` and numbers are invalid. (The global config keeps `"on"`/`"off"` for pilot flags.)
  - `string`: a string. Empty or whitespace-only counts as not set (for `partnerStorageDemoLabel`, off; for `partnerDocumentsLabel`, no label).
  - `image`: an object with `file` (R-1758-5) and `alt`, a string that isn't empty or whitespace-only. The kept value has only `file` and `alt`.
  - `documents`: the value, and every folder's `children`, must be an array; a non-array value drops the flag, and a folder with non-array `children` is dropped. Every item must be an object with a non-empty (not whitespace-only) string `name`. Each item is rebuilt from allowed keys only, recursively:
    - an item with `type: "folder"` is a folder and keeps `name`, `type: "folder"` and `children`; one with no `children` array is dropped, and its `url`, `location` and anything else are dropped;
    - any other item is a document and keeps `name`, `url` and, if it is a string, `description`; one with no valid `url` (R-1758-5) is dropped, and `location`, inline `content`, `type` and anything else are dropped.

    - a folder nested more than 10 levels deep (a top-level folder is level 1) is dropped on its own, with everything inside it.

    A folder whose children are all dropped stays, empty. A list left with no items at all counts as not set, like empty text, so "has documents" (stream term) is simply "`getFeatureValue("partnerDocuments")` is defined".

  *Verify:* unit tests per type with valid, invalid and mixed values, including empty alt text, an empty item name, a non-array list, a non-array `children`, a document with `location` but no `url`, a document with inline `content`, a folder with a `url`, a chain of 10 folders (kept) and of 11 (the eleventh dropped), and a list nested 100,000 levels (no throw).
- **R-1758-5.** Links and the logo file name (R-X-18, R-X-19):
  - A link (`partnerTermsUrl` and every document `url`) is a string that starts with `https://` (any letter case, nothing before it), parses as a URL, and whose whole raw string, fragment included, does not match jQuery's `rjsonp`, `/(=)\?(?=&|$)|\?\?/`. The kept value is the raw string, so what was checked is what CFM requests and what a link opens. Parsing alone is not enough: `https:example.org/a` and `https:/example.org/a` parse as absolute with no base, but a browser resolves them against the page as paths on CODAP's own host (checked with `new URL(u, "https://codap.concord.org/app/")`).
  - A logo `file` matches `/^[A-Za-z0-9][A-Za-z0-9_-]*\.(png|jpg|jpeg|gif|webp)$/i`: a plain name that can't name another folder, with an allowed raster extension and never `svg`.
  - In a document list, an item whose link fails is dropped on its own; a failing terms link or logo drops only that flag.

  *Verify:* unit tests: `http:`, relative, protocol-relative, `javascript:`, `https:example.org/a`, `https:/example.org/a` and leading-space links rejected; `https://` and `https://exa mple.org/a`, which start right but don't parse, rejected; `HTTPS://example.org/a` accepted; `=?` at the end of the query, `=?` only after `#`, and `??` rejected; `https://example.org/a?b=?c` accepted; a plain `https:` link accepted; logo names `.`, `..`, `a/b.png`, `.png`, `logo`, `logo.svg` and `logo.png.svg` rejected, and `logo-1.png` and `Logo.JPG` accepted; a list with one bad link and one good link keeps the good one.

### Frozen names

- **R-1758-6.** A test fails if a partner flag is added, removed, renamed or retyped. It compares the registry's partner flag names and types against a literal object written in the test (not a Jest snapshot, which `-u` rewrites quietly). *Verify:* renaming `hideShare` in a throwaway change fails the test.

### Regular CODAP

- **R-1758-7.** With no partner config applied, CODAP behaves exactly as today (R-X-28): every partner flag reads as unset (`isFeatureEnabled` false, `getFeatureValue` undefined), nothing is fetched, and no visible behavior changes. *Verify:* the existing suites pass unchanged, and a unit test reads every partner flag with nothing applied.

### Documentation

- **R-1758-8.** `v3/docs/feature-flags.md` gains a section on partner flags: the two kinds, the five types and their valid values, that only a partner config sets them (URL, documents and the global config ignore them), how to read them (`isFeatureEnabled` for boolean, `getFeatureValue` for the rest), and that they are fixed when CODAP starts, unlike pilot flags, which can change after a late server directive. The existing pilot-flag text stays. Other prose that describes which names a source accepts (the `features` comment in `url-params.ts`) is updated to say partner flag names are ignored. *Verify:* review in the PR.

## Technical Notes

- **Type enforcement.** A union of a pilot interface (`expires: string`, `kind?: never`, `type?: never`) and a partner interface (`kind: "partner"`, `type`, `expires?: never`) under the existing `satisfies Record<string, IFeatureFlagInfo>` rejects both and neither. TypeScript's union excess-property check is lenient (a key allowed in any member passes), so the `?: never` fields are what make "both" fail. Name subsets (pilot, boolean partner, value partner) can be derived from `typeof kFeatureFlags` with mapped types; `isFeatureEnabled`'s parameter then rejects value flags. Both checked with `tsc --strict` on a throwaway sketch.
- **Owner field.** Owner-token expansion and the owner/flag-name disjointness test are pilot concepts. A partner entry can't carry an `owner` (`owner?: never`), which is what R-1758-3's verify line relies on for owner tokens, and `flagsForOwner` and `isFeatureFlagOwner` never involve partner flags.
- **Name checks.** Today every source uses `isFeatureFlagName`. Partner exclusion is easiest to keep correct if the sources use a pilot-only name check, so a partner name never passes into them, rather than filtering partner names at each site.
- **Validation home.** Jira suggests `feature-flag-config.ts`, which today holds only the global config's fetch and validation. Where partner validation lives is settled in the implementation spec.
- **Value types.** `getFeatureValue` returns `string` for `string` and `url`, `{ file: string, alt: string }` for `image`, and an array of document `{ name, url, description? }` and folder `{ name, type: "folder", children }` items for `documents`. CODAP-1763 passes the list to CFM's read-only provider as its `json` option (no `src`, so CFM resolves no base URL).
- **CODAP-1759 boundary.** This story does not fetch configs, read `?partner=`, check `version`, publish the manifest or log config ids. It provides the registry, the typed reads, the validated entry point and the enumeration the manifest needs.

## Out of Scope

- Loading a config, `?partner=`, the 5-second hold, config `version` checks, the environment rule, `partner-flags.json` and logging (CODAP-1759).
- Any visible use of a partner flag: header, About dialog, Help menu, Open/Save/export dialogs, Share menu, Plugins button (CODAP-1762, CODAP-1763, CFM-25).
- Resolving the logo file to a URL in the config's folder (CODAP-1759).
- Removing partner flag names already stored in documents (decision 39).
- Repointing the feature-flag tests off `residualPlot`.
- Limits on text length or list size.

## Open Questions

### RESOLVED: Judgment call: does whitespace-only text count as set?
**Context**: R-1758-4 says an empty text value counts as not set. A label of `"   "` would turn on the demo storage tab with a blank name.
**Options considered**:
- A) Only `""` is empty; whitespace is a real value.
- B) Empty or whitespace-only counts as not set, and the same rule applies to `alt` and item names.

**Decision**: B. A blank tab label or blank alt text helps no one and is a typing slip in practice. The kept value is otherwise stored as written (no trimming), so a real label keeps its spacing.

### RESOLVED: Judgment call: what happens to an item with a non-string `description`?
**Context**: A document's `description` is optional. A config could give it a number or an object.
**Options considered**:
- A) Drop the whole document.
- B) Drop only the `description`; keep the document.

**Decision**: B. It matches "an invalid value is dropped on its own": the document's name and link are still good, and the description is optional anyway.

### RESOLVED: Judgment call: does the manager accept validated or raw partner values?
**Context**: CODAP-1759 needs a way to apply a config's `flags`. The manager could take already-validated values (validation a separate call) or the raw object.
**Options considered**:
- A) Validated values; CODAP-1759 calls validation first.
- B) The raw `flags` object; the manager validates inside its one entry point.

**Decision**: B (R-1758-3a). An unvalidated value then has no route into the manager, rather than relying on every caller remembering the validation step.

### RESOLVED: Low confidence: may the partner entry point be called more than once?
**Context**: Partner settings are read once at startup (R-X-4) and CODAP-1759 calls the entry point once. Allowing a second call (each call replacing the previous values) keeps tests simple; refusing it enforces "fixed at startup" in code.
**Options considered**:
- A) Each call replaces the partner values; "once" is CODAP-1759's contract.
- B) Calls after the first are ignored.

**Decision**: A. The manager's own tests build a fresh `FeatureFlagManager` per test, but `app-state.test.ts` and the component tests CODAP-1762 and CODAP-1763 will write use the shared `featureFlagManager` singleton, so they need to set partner values and reset them (an empty object clears them). B would make those tests order-dependent. "Fixed at startup" holds because CODAP-1759 is the only production caller and calls it once before CODAP renders; the docs say so (R-1758-8).

### RESOLVED: Low confidence: does an empty folder count toward "has documents"?
**Context**: The stream requirements define "has documents" as at least one item left after validation. Under R-1758-4 a folder whose children were all dropped stays, empty, so a list holding only that folder "has documents" and would replace Example Documents with an empty folder.
**Options considered**:
- A) Keep empty folders; an empty folder still counts.
- B) Drop folders left empty after validation, recursively.

**Decision**: A. CFM accepts `children: []` (it only treats `children == null` specially) and shows an empty folder. An author can make an empty folder on purpose while building a list (CODAP-1760's form), and B would silently drop it, which is harder to explain than an empty folder. A list that is only an empty folder is what the author wrote.

### RESOLVED: Cross-reference: no unit test for owner tokens
**Context**: R-1758-3 asked for a unit test per source. The plan has none for owner tokens, because a partner entry can't carry an `owner` and such a test can't fail.
**Options considered**:
- A) Change R-1758-3's verify line to cite the type guard.
- B) Add the test anyway.

**Decision**: A (Doug, stage 8).

### RESOLVED: Cross-reference: validation rules stricter than Jira
**Context**: Four rules go beyond Jira's text: links start with `https://`, whitespace-only text is unset, an empty document list is unset, and folders deeper than 10 levels are dropped.
**Options considered**:
- A) Keep all four with no Jira change.
- B) Keep them and propose a Jira change.
- C) Drop some.

**Decision**: A (Doug, stage 8). They fall under Jira's "absolute `https:` link" and "dropped without breaking anything" criteria. Partner validation lives in a new `partner-flag-values.ts`, not `feature-flag-config.ts` as Jira suggests (Doug, stage 8; see implementation.md).

## Self-Review

Roles: Security Engineer, Senior Engineer, QA Engineer, and Downstream Implementer (the CODAP-1759, CODAP-1762 and CODAP-1763 work that consumes this story's reads). Round 2 added a Spec Consistency reviewer; its implementation findings are in implementation.md. Round 3 added a Product Owner; its implementation findings are in implementation.md.

### Downstream Implementer

#### RESOLVED: An empty document list would replace Example Documents with nothing
CODAP-1763's Jira text switches the read-only provider to the partner list "when `partnerDocuments` is set". As drafted, a list whose items were all dropped validated to `[]`, which is set, so CODAP-1763 would show an empty partner tab instead of Example Documents, while the stream requirements say such a list "counts as no documents". Fixed in R-1758-4: a list left empty counts as not set, the same rule as empty text, so consumers need no length check.

---

### Security Engineer

#### RESOLVED: Deeply nested folders crash CFM's Open dialog
`JSON.parse` accepts 100,000 levels of nesting, and a throwaway run of CFM 2.3's read-only provider with a valid folder chain threw `RangeError: Maximum call stack size exceeded` at 2,000 levels (1,000 was fine). R-1758-4 already says CODAP's own validation never throws, but a list deep enough to pass a CODAP validator and still overflow CFM's recursion (`_convertJSONToMetadataTree` plus a promise per folder, several frames per level) would break that config's Open dialog. The harm is limited to the config's own link, but "dropped without breaking anything" is the requirement. Suggested resolution: a folder nested more than 10 levels deep is dropped on its own (the shared test config uses 2). CODAP-1760's form would ideally not offer deeper nesting, which touches a story that consumes this rule.

**Resolution**: applied to R-1758-4, a folder deeper than 10 levels is dropped on its own. No decision needed from Doug: CODAP-1760's Jira text has "optional folders" in a documents editor and sets no depth, any real document list is far shallower, and the limit costs one counter in the validator. CODAP-1760's implementer should know the limit exists; the spec for that story can cite R-1758-4, and no Jira change is proposed.

---

### Spec Consistency (round 2)

#### RESOLVED: The owner-field note left open what R-1758-3 depends on
Technical Notes called an `owner` on partner entries "an implementation choice", while R-1758-3's verify line (settled at stage 8) drops the owner-token test because a partner entry can't declare an `owner`. With an optional `owner` the no-test decision would be unsound. The note now states the `owner?: never` rule that the plan implements and the verify line relies on.

#### RESOLVED: The link verify list missed a link that fails only to parse
R-1758-5 requires a link to parse, but no listed case starts with `https://`, passes the JSONP check, and fails to parse, so the parse step could be deleted unnoticed (shown by mutation; see implementation.md). The verify list now includes `https://` and `https://exa mple.org/a`.

---

### Product Owner (round 3)

#### RESOLVED: The Project Owner Overview counted eight stories
The stream requirements list seven stories (CODAP-1758, CODAP-1759, CODAP-1760, CFM-25, CODAP-1762, CODAP-1763 and CODAP-1764), since CODAP-1760 now covers the whole authoring page, editing form included. The overview now says seven.

