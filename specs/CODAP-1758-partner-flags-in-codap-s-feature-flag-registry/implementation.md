# Implementation Plan: Partner flags in CODAP's feature-flag registry

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1758
**Requirements Spec**: [requirements.md](requirements.md)
**Status**: **In Development**

## Implementation Plan

Four commits, all in `v3/`. No dependency or lockfile changes. Every code block below was built in the worktree during speccing and checked with `npm run build:tsc` (no errors in these files), `npm run lint` on `src/models/feature-flags` (clean) and `npm test -- src/models/feature-flags src/models/app-state` (56 passing after the first commit alone, 113 after the second, 125 after the third; the map, data-display and case-tile suites that read pilot flags, 986 tests, also pass), then removed. Each `@ts-expect-error` check was shown to fail the build when the type rule it guards is removed.

Set `added` on the ten partner entries to the date of the commit that adds them; `2026-12-01` below is a placeholder.

### Registry: partner flag kind, the ten partner flags, and pilot-only sources

**Summary**: Splits `IFeatureFlagInfo` into a pilot entry and a partner entry enforced by the type, defines the ten partner flags, derives typed name subsets, and points every existing source (URL, owner tokens, server config, document grants) at pilot flags only. After this commit a partner flag can't be turned on by anything; there is no way to set one yet. Covers R-1758-1, R-1758-2, R-1758-2c, R-1758-3 (sources), R-1758-3b, R-1758-6.

**Files affected**:
- `v3/src/models/feature-flags/feature-flag-registry.ts`: entry types, partner entries, name types and helpers.
- `v3/src/models/feature-flags/feature-flag-config.ts`: `FeatureFlagConfig` and `validateFeatureFlagConfig` take pilot names only.
- `v3/src/models/feature-flags/feature-flag-manager.ts`: sources and `isFeatureEnabled` typed and checked as pilot-only.
- `v3/src/models/feature-flags/feature-flag-registry.test.ts`, `feature-flag-config.test.ts`: new tests.

**Estimated diff size**: ~230 lines

**`feature-flag-registry.ts`.** In the header comment, "Flag names arriving from URLs, the server config, or saved documents" becomes "Pilot flag names arriving from URLs, the server config, or saved documents" (rewrap to the comment's width). The comment above `kFeatureFlags` says the registry must never be empty because `keyof {}` would make every `isFeatureEnabled()` call a type error; with partner entries the registry is never empty, but with no pilot entries `PilotFlagName` is `never` and the registry, config and manager no longer compile, so that comment becomes:

```ts
/*
 * Keep entries alphabetical. The registry must always hold at least one pilot
 * flag: with none, `PilotFlagName` is `never` and the pilot-only sources in this
 * folder no longer compile.
 */
```

Replace the `IFeatureFlagInfo` interface with:

```ts
interface IFeatureFlagInfoBase {
  // what the flag gates, in a sentence
  description: string
  // ISO date the flag was added
  added: string
}

/*
 * A pilot flag gates an in-development feature for a limited audience and is
 * meant to graduate or be retired by its expiration date.
 */
export interface IPilotFlagInfo extends IFeatureFlagInfoBase {
  // the project or grant responsible for the feature, e.g. "ESTEEM"
  owner: string
  // ISO date by which the flag should have graduated or been retired
  expires: string
  kind?: never
  type?: never
}

/*
 * The kinds of value a partner flag holds. These names are also the type names
 * CODAP publishes for partner config authors, so they are part of the contract.
 */
export type PartnerFlagType = "boolean" | "string" | "url" | "image" | "documents"

/*
 * A partner flag is a per-partner setting. It never expires, and only a partner
 * config can set it; the url, documents and the server config ignore it.
 */
export interface IPartnerFlagInfo extends IFeatureFlagInfoBase {
  kind: "partner"
  type: PartnerFlagType
  owner?: never
  expires?: never
}

// The `never` fields make an entry with both kinds' fields, or neither's, a type error.
export type IFeatureFlagInfo = IPilotFlagInfo | IPartnerFlagInfo
```

Add the partner entries to `kFeatureFlags`, merged alphabetically with the pilot entries (the registry comment asks for alphabetical order):

```ts
  hideGoogleDrive: {
    description: "Hides Google Drive in the Open, Save and export dialogs",
    added: "2026-12-01",
    kind: "partner",
    type: "boolean"
  },
  hideLocalFile: {
    description: "Hides local files in the file dialogs, the Import dialog and the graph's background image item",
    added: "2026-12-01",
    kind: "partner",
    type: "boolean"
  },
  hidePlugins: {
    description: "Hides the Plugins button on the tool shelf",
    added: "2026-12-01",
    kind: "partner",
    type: "boolean"
  },
  hideShare: {
    description: "Hides the File menu's Share entry with its items, and Revert to shared view",
    added: "2026-12-01",
    kind: "partner",
    type: "boolean"
  },
  partnerDocuments: {
    description: "The partner's documents, listed in place of Example Documents",
    added: "2026-12-01",
    kind: "partner",
    type: "documents"
  },
  partnerDocumentsLabel: {
    description: "The label of the Open dialog tab holding the partner's documents",
    added: "2026-12-01",
    kind: "partner",
    type: "string"
  },
  partnerLogo: {
    description: "The partner's logo and its alt text",
    added: "2026-12-01",
    kind: "partner",
    type: "image"
  },
  partnerName: {
    description: "The partner's name, shown in the About dialog",
    added: "2026-12-01",
    kind: "partner",
    type: "string"
  },
  partnerStorageDemoLabel: {
    description: "The label of the demo storage tab in the file dialogs; empty means off",
    added: "2026-12-01",
    kind: "partner",
    type: "string"
  },
  partnerTermsUrl: {
    description: "A link to the partner's terms of use",
    added: "2026-12-01",
    kind: "partner",
    type: "url"
  },
```

Replace everything after the registry object with:

```ts
type FeatureFlags = typeof kFeatureFlags

export type FeatureFlagName = keyof FeatureFlags

export type PilotFlagName = {
  [K in FeatureFlagName]: FeatureFlags[K] extends { expires: string } ? K : never
}[FeatureFlagName]

export type PartnerFlagName = Exclude<FeatureFlagName, PilotFlagName>

export type BooleanPartnerFlagName = {
  [K in PartnerFlagName]: FeatureFlags[K] extends { type: "boolean" } ? K : never
}[PartnerFlagName]

// partner flags that hold a value rather than on or off; read with getFeatureValue()
export type ValuePartnerFlagName = Exclude<PartnerFlagName, BooleanPartnerFlagName>

// the flags isFeatureEnabled() can read
export type EnableableFlagName = PilotFlagName | BooleanPartnerFlagName

export function isFeatureFlagName(name: string): name is FeatureFlagName {
  return Object.prototype.hasOwnProperty.call(kFeatureFlags, name)
}

export function isPartnerFlagName(name: string): name is PartnerFlagName {
  return isFeatureFlagName(name) && "kind" in kFeatureFlags[name]
}

export function isPilotFlagName(name: string): name is PilotFlagName {
  return isFeatureFlagName(name) && !isPartnerFlagName(name)
}

export const kFeatureFlagNames = Object.keys(kFeatureFlags) as FeatureFlagName[]

export const kPilotFlagNames = kFeatureFlagNames.filter(isPilotFlagName)

export const kPartnerFlagNames = kFeatureFlagNames.filter(isPartnerFlagName)

export function isFeatureFlagOwner(name: string): boolean {
  return kPilotFlagNames.some(flag => kFeatureFlags[flag].owner === name)
}

export function flagsForOwner(owner: string): PilotFlagName[] {
  return kPilotFlagNames.filter(flag => kFeatureFlags[flag].owner === owner)
}
```

`isPartnerFlagName` uses `"kind" in ...` because pilot entries under `as const` have no `kind` property to read. `flagsForOwner` and `isFeatureFlagOwner` iterate pilot names, so owner tokens can't reach a partner flag, and `flagsForOwner` returns `PilotFlagName[]`, which is what lets `urlFlags` stay typed as pilot-only.

**`feature-flag-config.ts`.** Import `isPilotFlagName, PilotFlagName` in place of `FeatureFlagName, isFeatureFlagName`; `FeatureFlagConfig` becomes `Partial<Record<PilotFlagName, FeatureFlagDirective>>`; `validateFeatureFlagConfig` checks `isPilotFlagName(name)`; its comment says "isn't a registered pilot flag".

**`feature-flag-manager.ts`.** Import `flagsForOwner, isFeatureFlagOwner, isPilotFlagName, PilotFlagName` from the registry. Every `FeatureFlagName` becomes `PilotFlagName` (`serverFlags`, `documentFlags`, `urlFlags`, `urlEnabledFlags`, the `isFeatureEnabled` method and the exported `isFeatureEnabled`), and the three `isFeatureFlagName(...)` checks (in `urlFlags`, `setServerConfig`, `setDocumentFlags`) become `isPilotFlagName(...)`. The type change is what makes the exclusions hold: a partner name can't be stored in any of the three sources.

**Tests.** Append to `feature-flag-registry.test.ts` (and add `IFeatureFlagInfo, isPartnerFlagName, isPilotFlagName, kPartnerFlagNames, kPilotFlagNames` to its import):

```ts
describe("partner flags", () => {
  /*
   * A partner config names its flags, and a name this build doesn't know is dropped
   * silently, so a renamed hide flag would quietly bring back a feature a partner
   * had hidden. Change this list only together with the registry, deliberately.
   */
  it("freezes the partner flag names and types", () => {
    const actual = Object.fromEntries(kPartnerFlagNames.map(name => [name, kFeatureFlags[name].type]))
    expect(actual).toEqual({
      hideGoogleDrive: "boolean",
      hideLocalFile: "boolean",
      hidePlugins: "boolean",
      hideShare: "boolean",
      partnerDocuments: "documents",
      partnerDocumentsLabel: "string",
      partnerLogo: "image",
      partnerName: "string",
      partnerStorageDemoLabel: "string",
      partnerTermsUrl: "url"
    })
  })

  it("splits every flag into exactly one kind", () => {
    expect(kPilotFlagNames.length).toBeGreaterThan(0)
    expect(kPartnerFlagNames.length).toBeGreaterThan(0)
    expect([...kPilotFlagNames, ...kPartnerFlagNames].sort()).toEqual([...kFeatureFlagNames].sort())
    expect(isPartnerFlagName("noSuchFlag")).toBe(false)
    expect(isPilotFlagName("noSuchFlag")).toBe(false)
  })


  // checked by the type checker (npm run build:tsc), not at runtime
  it("rejects an entry of both kinds or neither", () => {
    const typeChecks = () => {
      const pilotAndPartner =
        { description: "", added: "", owner: "X", expires: "", kind: "partner", type: "url" } as const
      const noKind = { description: "", added: "" }
      // @ts-expect-error an entry can't be both a pilot and a partner flag
      const both: IFeatureFlagInfo = pilotAndPartner
      // @ts-expect-error an entry must be one kind or the other
      const neither: IFeatureFlagInfo = noKind
      return [both, neither]
    }
    expect(typeChecks).toBeInstanceOf(Function)
  })
})
```

The frozen-names test compares with a literal written in the test (R-1758-6); renaming `hideShare` in the registry fails it. The `@ts-expect-error` lines fail `npm run build:tsc` if the union stops rejecting either case: removing both `?: never` fields from `IPilotFlagInfo` was checked to produce "Unused '@ts-expect-error' directive". Jest runs the test but doesn't call `typeChecks`; the build is what enforces it.

Add to `feature-flag-config.test.ts`, after "drops flags that are not in the registry":

```ts
  // partner flags come only from a partner config
  it("drops partner flags", () => {
    expect(validateFeatureFlagConfig({ hideShare: "on", [kFlag]: "on" })).toEqual({ [kFlag]: "on" })
  })
```

The existing tests in all four feature-flag suites and `app-state.test.ts` pass unchanged (R-1758-3b).

---

### Partner flag value validation

**Summary**: A new module with the value types and `validatePartnerFlags`, which reduces a raw `flags` object to valid partner values. Nothing calls it yet. Covers R-1758-4 and R-1758-5.

**Files affected**:
- `v3/src/models/feature-flags/partner-flag-values.ts` (new)
- `v3/src/models/feature-flags/partner-flag-values.test.ts` (new)

**Estimated diff size**: ~330 lines (about 130 code, 200 test)

A new file rather than `feature-flag-config.ts` (Jira's suggestion): that file is the global config's fetch and `"on"`/`"off"` parsing, and CODAP-1759 will add partner config loading, which imports this module beside its own fetch.

`validateItems` stops recursing at `kMaxPartnerFolderDepth`, so validation can't overflow the stack on any input, with no `try`/`catch` needed: an item that isn't an object (including a nested array) is dropped without recursion, and a folder deeper than the limit is dropped before its children are visited.

`partner-flag-values.ts`:

```ts
import { isPartnerFlagName, kFeatureFlags, PartnerFlagName, PartnerFlagType } from "./feature-flag-registry"

export interface IPartnerImage {
  // a plain file name in the partner config's own folder
  file: string
  alt: string
}

export interface IPartnerDocument {
  name: string
  url: string
  description?: string
}

export interface IPartnerFolder {
  name: string
  type: "folder"
  children: PartnerDocumentItem[]
}

// the cloud-file-manager read-only provider's list format, restricted to inline folders
export type PartnerDocumentItem = IPartnerDocument | IPartnerFolder

interface IPartnerFlagValueTypes {
  boolean: boolean
  string: string
  url: string
  image: IPartnerImage
  documents: PartnerDocumentItem[]
}

export type PartnerFlagValue<N extends PartnerFlagName> = IPartnerFlagValueTypes[(typeof kFeatureFlags)[N]["type"]]

export type PartnerFlagValues = { [N in PartnerFlagName]?: PartnerFlagValue<N> }

/*
 * jQuery's own test for a JSONP request (jQuery 3.7.1, src/ajax/jsonp.js). The
 * cloud-file-manager loads document links with `$.ajax({ dataType: "json" })`,
 * which jQuery turns into a <script> load when the whole url, fragment included,
 * matches this. Keep it identical to jQuery's.
 */
const kJsonpUrlRegex = /(=)\?(?=&|$)|\?\?/

// a plain name that can't reach another folder, with a raster extension; svg can run script when opened directly
const kPartnerImageFileRegex = /^[A-Za-z0-9][A-Za-z0-9_-]*\.(png|jpg|jpeg|gif|webp)$/i

// folders nested deeper than this are dropped; cloud-file-manager's recursion overflows the stack on deep lists
export const kMaxPartnerFolderDepth = 10

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== ""
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

/*
 * The `https://` prefix test is on the raw string because the url parser alone
 * accepts `https:example.org`, which a page resolves as a path on its own host.
 */
export function isValidPartnerUrl(value: unknown): value is string {
  if (typeof value !== "string" || !/^https:\/\//i.test(value)) return false
  try {
    new URL(value)
  }
  catch {
    return false
  }
  return !kJsonpUrlRegex.test(value)
}

export function isValidPartnerImageFile(value: unknown): value is string {
  return typeof value === "string" && kPartnerImageFileRegex.test(value)
}

function validateImage(value: unknown): IPartnerImage | undefined {
  if (!isObject(value)) return
  const { file, alt } = value
  if (!isValidPartnerImageFile(file) || !isNonBlankString(alt)) return
  return { file, alt }
}

function validateItem(item: unknown, depth: number): PartnerDocumentItem[] {
  if (!isObject(item) || !isNonBlankString(item.name)) return []
  const { name } = item
  if (item.type === "folder") {
    if (depth > kMaxPartnerFolderDepth) return []
    const children = validateItems(item.children, depth + 1)
    return children ? [{ name, type: "folder", children }] : []
  }
  if (!isValidPartnerUrl(item.url)) return []
  const { url, description } = item
  return [typeof description === "string" ? { name, url, description } : { name, url }]
}

// `depth` is the folder level the items sit in; the top-level list is level 1
function validateItems(value: unknown, depth: number): PartnerDocumentItem[] | undefined {
  if (!Array.isArray(value)) return
  return value.flatMap(item => validateItem(item, depth))
}

function validateDocuments(value: unknown): PartnerDocumentItem[] | undefined {
  const items = validateItems(value, 1)
  return items?.length ? items : undefined
}

const kPartnerFlagValidators: { [T in PartnerFlagType]: (value: unknown) => IPartnerFlagValueTypes[T] | undefined } = {
  boolean: value => typeof value === "boolean" ? value : undefined,
  string: value => isNonBlankString(value) ? value : undefined,
  url: value => isValidPartnerUrl(value) ? value : undefined,
  image: validateImage,
  documents: validateDocuments
}

/*
 * Reduces a partner config's `flags` object to the partner flag values that pass
 * their type's checks. Each value stands alone: an invalid one is dropped and the
 * rest still apply. Names that aren't partner flags, pilot flag names included,
 * are ignored, so a partner config can't turn on a pilot feature.
 */
export function validatePartnerFlags(flags: unknown): PartnerFlagValues {
  const values: PartnerFlagValues = {}
  if (!isObject(flags)) return values
  Object.entries(flags).forEach(([name, value]) => {
    if (!isPartnerFlagName(name)) return
    const valid = kPartnerFlagValidators[kFeatureFlags[name].type](value)
    if (valid !== undefined) Object.assign(values, { [name]: valid })
  })
  return values
}
```

`partner-flag-values.test.ts`:

```ts
import {
  isValidPartnerImageFile, isValidPartnerUrl, kMaxPartnerFolderDepth, validatePartnerFlags
} from "./partner-flag-values"

const kDocUrl = "https://example.org/mammals.json"

function folderChain(depth: number): unknown[] {
  let items: unknown[] = [{ name: "leaf", url: kDocUrl }]
  for (let level = depth; level >= 1; level--) {
    items = [{ name: `level ${level}`, type: "folder", children: items }]
  }
  return items
}

function chainDepth(items: unknown): number {
  let depth = 0
  let current = items as any[] | undefined
  while (current?.[0]?.type === "folder") {
    depth++
    current = current[0].children
  }
  return depth
}

describe("isValidPartnerUrl", () => {
  it.each([
    "https://example.org/a.json",
    "HTTPS://example.org/a.json",
    // `=?` followed by something other than `&` or the end isn't a jsonp callback
    "https://example.org/a?b=?c"
  ])("accepts %s", url => {
    expect(isValidPartnerUrl(url)).toBe(true)
  })

  it.each([
    "http://example.org/a.json",
    "/a.json",
    "a.json",
    "//example.org/a.json",
    "javascript:alert(1)",
    // these parse as absolute on their own, but a page resolves them against its own host
    "https:example.org/a.json",
    "https:/example.org/a.json",
    " https://example.org/a.json",
    // these start with `https://` but don't parse
    "https://",
    "https://exa mple.org/a.json",
    // jQuery turns these into a <script> load
    "https://example.org/a.json?callback=?",
    "https://example.org/a.json?callback=?&x=1",
    "https://example.org/a.json#=?",
    "https://example.org/a.json??",
    ""
  ])("rejects %s", url => {
    expect(isValidPartnerUrl(url)).toBe(false)
  })

  it("rejects a value that isn't a string", () => {
    expect(isValidPartnerUrl(42)).toBe(false)
    expect(isValidPartnerUrl({ href: kDocUrl })).toBe(false)
  })
})

describe("isValidPartnerImageFile", () => {
  it.each(["logo-1.png", "Logo.JPG", "logo_2.jpeg", "a.gif", "b.webp"])("accepts %s", file => {
    expect(isValidPartnerImageFile(file)).toBe(true)
  })

  it.each([".", "..", "a/b.png", "../logo.png", ".png", "logo", "logo.svg", "logo.png.svg", "-logo.png", "logo.png\n"])(
    "rejects %j", file => {
      expect(isValidPartnerImageFile(file)).toBe(false)
    })
})

describe("validatePartnerFlags", () => {
  it("keeps valid values of every type", () => {
    const flags = {
      hideShare: true,
      hidePlugins: false,
      partnerName: "Example Publisher",
      partnerTermsUrl: "https://example.org/terms",
      partnerLogo: { file: "logo-1.png", alt: "Example Publisher" },
      partnerDocuments: [{ name: "Mammals", url: kDocUrl, description: "Mammal data" }]
    }
    expect(validatePartnerFlags(flags)).toEqual(flags)
  })

  it("drops an invalid value on its own and keeps the rest", () => {
    expect(validatePartnerFlags({ hideShare: "on", partnerName: "Example Publisher" }))
      .toEqual({ partnerName: "Example Publisher" })
  })

  it("ignores unknown names and pilot flag names", () => {
    expect(validatePartnerFlags({ noSuchFlag: true, residualPlot: true, hideShare: true })).toEqual({ hideShare: true })
  })

  it("returns no values for a payload that isn't an object", () => {
    expect(validatePartnerFlags(null)).toEqual({})
    expect(validatePartnerFlags([{ hideShare: true }])).toEqual({})
    expect(validatePartnerFlags("hideShare")).toEqual({})
  })

  it("accepts only JSON booleans for on or off flags", () => {
    expect(validatePartnerFlags({ hideShare: "on", hidePlugins: "true", hideLocalFile: 1 })).toEqual({})
  })

  it("treats empty and whitespace-only text as not set", () => {
    expect(validatePartnerFlags({ partnerStorageDemoLabel: "", partnerDocumentsLabel: "  ", partnerName: 7 }))
      .toEqual({})
  })

  it("keeps text exactly as written", () => {
    expect(validatePartnerFlags({ partnerStorageDemoLabel: " Classroom " }))
      .toEqual({ partnerStorageDemoLabel: " Classroom " })
  })

  it("drops a terms link that fails the link checks", () => {
    expect(validatePartnerFlags({ partnerTermsUrl: "https://example.org/terms#=?" })).toEqual({})
  })

  describe("partnerLogo", () => {
    it("keeps only the file and alt text", () => {
      expect(validatePartnerFlags({ partnerLogo: { file: "logo-1.png", alt: "Logo", width: 9 } }))
        .toEqual({ partnerLogo: { file: "logo-1.png", alt: "Logo" } })
    })

    it.each([
      { file: "logo-1.png", alt: "" },
      { file: "logo-1.png", alt: "  " },
      { file: "logo-1.png" },
      { file: "logo.svg", alt: "Logo" },
      { file: "../logo.png", alt: "Logo" },
      "logo-1.png"
    ])("drops %j", partnerLogo => {
      expect(validatePartnerFlags({ partnerLogo })).toEqual({})
    })
  })

  describe("partnerDocuments", () => {
    it("rebuilds documents and folders from their allowed keys", () => {
      const partnerDocuments = [
        { name: "Mammals", url: kDocUrl, description: "Mammal data", content: { evil: true }, location: "x" },
        { name: "Unit 1", type: "folder", url: "https://example.org/list.json", children: [
          { name: "Roller Coasters", url: kDocUrl, type: "file", mimeType: "text/html" }
        ] }
      ]
      expect(validatePartnerFlags({ partnerDocuments })).toEqual({ partnerDocuments: [
        { name: "Mammals", url: kDocUrl, description: "Mammal data" },
        { name: "Unit 1", type: "folder", children: [{ name: "Roller Coasters", url: kDocUrl }] }
      ] })
    })

    it("drops a description that isn't text and keeps its document", () => {
      expect(validatePartnerFlags({ partnerDocuments: [{ name: "Mammals", url: kDocUrl, description: 3 }] }))
        .toEqual({ partnerDocuments: [{ name: "Mammals", url: kDocUrl }] })
    })

    it("drops items that fail their checks and keeps the rest", () => {
      const partnerDocuments = [
        { name: "Good", url: kDocUrl },
        { name: "Callback", url: "https://example.org/a.json?cb=?" },
        { name: "Insecure", url: "http://example.org/a.json" },
        // cloud-file-manager would load this by `location`, unchecked
        { name: "Location only", location: kDocUrl },
        // cloud-file-manager loops forever on a file with neither url nor content
        { name: "Content only", content: { type: "CODAP" } },
        { name: "", url: kDocUrl },
        { name: "  ", url: kDocUrl },
        { url: kDocUrl },
        // cloud-file-manager would fetch the folder's list from its url, unchecked
        { name: "Linked folder", type: "folder", url: "https://example.org/list.json" },
        { name: "Object children", type: "folder", children: { a: "b" } },
        null,
        "Mammals",
        [kDocUrl]
      ]
      expect(validatePartnerFlags({ partnerDocuments })).toEqual({ partnerDocuments: [{ name: "Good", url: kDocUrl }] })
    })

    it("keeps a folder whose children were all dropped", () => {
      const partnerDocuments = [{ name: "Unit 1", type: "folder", children: [{ name: "Bad", url: "http://x.org/a" }] }]
      expect(validatePartnerFlags({ partnerDocuments }))
        .toEqual({ partnerDocuments: [{ name: "Unit 1", type: "folder", children: [] }] })
    })

    // cloud-file-manager reads a list that isn't an array as its older format, with inline content
    it("drops a list that isn't an array", () => {
      expect(validatePartnerFlags({ partnerDocuments: { "Mammals": "{}" } })).toEqual({})
    })

    it("treats a list left with no items as not set", () => {
      expect(validatePartnerFlags({ partnerDocuments: [] })).toEqual({})
      expect(validatePartnerFlags({ partnerDocuments: [{ name: "Bad", url: "http://x.org/a" }] })).toEqual({})
    })

    it(`keeps folders ${kMaxPartnerFolderDepth} levels deep and drops deeper ones`, () => {
      const kept = validatePartnerFlags({ partnerDocuments: folderChain(kMaxPartnerFolderDepth) })
      expect(chainDepth(kept.partnerDocuments)).toBe(kMaxPartnerFolderDepth)

      const trimmed = validatePartnerFlags({ partnerDocuments: folderChain(kMaxPartnerFolderDepth + 1) })
      expect(chainDepth(trimmed.partnerDocuments)).toBe(kMaxPartnerFolderDepth)
    })

    it("doesn't throw on extreme nesting", () => {
      const depth = 100000
      const nestedArrays = JSON.parse(`${"[".repeat(depth)}${"]".repeat(depth)}`)
      expect(validatePartnerFlags({ partnerDocuments: nestedArrays })).toEqual({})
      expect(chainDepth(validatePartnerFlags({ partnerDocuments: folderChain(20000) }).partnerDocuments))
        .toBe(kMaxPartnerFolderDepth)
    })
  })
})
```

---

### Partner config layer in the feature-flag manager

**Summary**: The manager gains the partner layer: `setPartnerFlags(flags: unknown)`, which validates and replaces; `isFeatureEnabled` accepts boolean partner flags; `getFeatureValue` reads value flags; both reads are reactive. Covers R-1758-2a, R-1758-2b, R-1758-3 (save path), R-1758-3a, R-1758-7.

**Files affected**:
- `v3/src/models/feature-flags/feature-flag-manager.ts`
- `v3/src/models/feature-flags/feature-flag-manager.test.ts`
- `v3/src/models/feature-flags/feature-flag-document.test.ts`

**Estimated diff size**: ~170 lines

**`feature-flag-manager.ts`.** Imports become:

```ts
import {
  EnableableFlagName, flagsForOwner, isFeatureFlagOwner, isPartnerFlagName, isPilotFlagName, PilotFlagName,
  ValuePartnerFlagName
} from "./feature-flag-registry"
import { PartnerFlagValue, PartnerFlagValues, validatePartnerFlags } from "./partner-flag-values"
```

Add the observable after `documentFlags`:

```ts
  @observable.ref
  private partnerFlags: PartnerFlagValues = {}
```

Add the action after `setDocumentFlags`:

```ts
  /*
   * Applies a partner config's `flags`, replacing any applied before. Values are
   * validated here, so an invalid one never reaches a reader. CODAP applies its
   * partner config once, before it renders; see docs/feature-flags.md.
   */
  @action
  setPartnerFlags(flags: unknown) {
    this.partnerFlags = validatePartnerFlags(flags)
  }
```

The `isFeatureEnabled` method takes `EnableableFlagName` and checks partner flags first; partner flags are not part of the pilot resolution order:

```ts
  isFeatureEnabled(name: EnableableFlagName): boolean {
    if (isPartnerFlagName(name)) return this.partnerFlags[name] === true
    if (this.serverFlags.get(name) === "off") return false
    ...unchanged
  }

  getFeatureValue<N extends ValuePartnerFlagName>(name: N): PartnerFlagValue<N> | undefined {
    return this.partnerFlags[name]
  }
```

The exported `isFeatureEnabled` takes `EnableableFlagName`. Its comment says to read it during render because a late server directive can change a pilot flag, which no longer covers every flag it reads: CODAP-1763 reads the hide flags once, in the effect that initializes the cloud-file-manager. The comment becomes:

```ts
/*
 * The way gated code asks whether a pilot feature, or an on or off partner flag,
 * is on. Never read it at module scope. Read a pilot flag during render: gated
 * features register unconditionally and gate only their affordances, so that a
 * document containing artifacts of a feature still opens when the flag is off,
 * and so that a late-arriving server directive takes effect without a reload. A
 * partner flag is fixed when CODAP starts, so it may also be read once at setup.
 * See docs/feature-flags.md.
 */
```

A module-level reader joins it:

```ts
// The way code reads a partner flag that holds a value; see isFeatureEnabled() for on or off flags.
export function getFeatureValue<N extends ValuePartnerFlagName>(name: N): PartnerFlagValue<N> | undefined {
  return featureFlagManager.getFeatureValue(name)
}
```

**Tests.** In `feature-flag-manager.test.ts`, import `FeatureFlagConfig` from `./feature-flag-config` and `getFeatureValue, isFeatureEnabled` beside `FeatureFlagManager`, and add inside the top-level `describe`:

```ts
  describe("partner flags", () => {
    const kPartnerFlags = {
      hideShare: true,
      partnerName: "Example Publisher",
      partnerTermsUrl: "https://example.org/terms",
      partnerLogo: { file: "logo-1.png", alt: "Example Publisher" },
      partnerDocuments: [{ name: "Mammals", url: "https://example.org/mammals.json" }]
    }

    it("reads every partner flag as unset when no partner config is applied", () => {
      const manager = new FeatureFlagManager()
      expect(manager.isFeatureEnabled("hideGoogleDrive")).toBe(false)
      expect(manager.isFeatureEnabled("hideLocalFile")).toBe(false)
      expect(manager.isFeatureEnabled("hidePlugins")).toBe(false)
      expect(manager.isFeatureEnabled("hideShare")).toBe(false)
      expect(manager.getFeatureValue("partnerDocuments")).toBeUndefined()
      expect(manager.getFeatureValue("partnerDocumentsLabel")).toBeUndefined()
      expect(manager.getFeatureValue("partnerLogo")).toBeUndefined()
      expect(manager.getFeatureValue("partnerName")).toBeUndefined()
      expect(manager.getFeatureValue("partnerStorageDemoLabel")).toBeUndefined()
      expect(manager.getFeatureValue("partnerTermsUrl")).toBeUndefined()
    })

    it("applies the valid values of a partner config", () => {
      const manager = new FeatureFlagManager()
      manager.setPartnerFlags({ ...kPartnerFlags, hidePlugins: "yes", partnerStorageDemoLabel: 7 })
      expect(manager.isFeatureEnabled("hideShare")).toBe(true)
      expect(manager.isFeatureEnabled("hidePlugins")).toBe(false)
      expect(manager.getFeatureValue("partnerStorageDemoLabel")).toBeUndefined()
      expect(manager.getFeatureValue("partnerName")).toBe("Example Publisher")
      expect(manager.getFeatureValue("partnerTermsUrl")).toBe("https://example.org/terms")
      expect(manager.getFeatureValue("partnerLogo")).toEqual(kPartnerFlags.partnerLogo)
      expect(manager.getFeatureValue("partnerDocuments")).toEqual(kPartnerFlags.partnerDocuments)
    })

    it("replaces the partner values on each call", () => {
      const manager = new FeatureFlagManager()
      manager.setPartnerFlags(kPartnerFlags)
      manager.setPartnerFlags({})
      expect(manager.isFeatureEnabled("hideShare")).toBe(false)
      expect(manager.getFeatureValue("partnerName")).toBeUndefined()
    })

    it("can't turn on a pilot flag", () => {
      const manager = new FeatureFlagManager()
      manager.setPartnerFlags({ [kFlag]: true })
      expect(manager.isFeatureEnabled(kFlag)).toBe(false)
    })

    it("ignores a partner flag named by the features url parameter", () => {
      setUrlParams("?features=hideShare")
      const manager = new FeatureFlagManager()
      expect(manager.isFeatureEnabled("hideShare")).toBe(false)
      expect(manager.urlEnabledFlags).toEqual([])
    })

    it("ignores a partner flag disabled by the features url parameter", () => {
      setUrlParams("?features=-hideShare")
      const manager = new FeatureFlagManager()
      manager.setPartnerFlags({ hideShare: true })
      expect(manager.isFeatureEnabled("hideShare")).toBe(true)
    })

    it("ignores a partner flag named by the server config", () => {
      const manager = new FeatureFlagManager()
      manager.setServerConfig({ hideShare: "on" } as FeatureFlagConfig)
      expect(manager.isFeatureEnabled("hideShare")).toBe(false)
      manager.setPartnerFlags({ hideShare: true })
      manager.setServerConfig({ hideShare: "off" } as FeatureFlagConfig)
      expect(manager.isFeatureEnabled("hideShare")).toBe(true)
    })

    it("ignores a partner flag named by the open document", () => {
      const manager = new FeatureFlagManager()
      manager.setDocumentFlags(["hideShare"])
      expect(manager.isFeatureEnabled("hideShare")).toBe(false)
    })

    it("never records a partner flag for document persistence", () => {
      setUrlParams(`?features=${kFlag},hideShare`)
      const manager = new FeatureFlagManager()
      manager.setPartnerFlags({ hideShare: true })
      expect(manager.urlEnabledFlags).toEqual([kFlag])
    })

    // checked by the type checker (npm run build:tsc), not at runtime
    it("reads value flags only with getFeatureValue and on or off flags only with isFeatureEnabled", () => {
      const typeChecks = () => {
        // @ts-expect-error a value flag is read with getFeatureValue(), not as on or off
        isFeatureEnabled("partnerName")
        // @ts-expect-error an on or off flag is read with isFeatureEnabled()
        getFeatureValue("hideShare")
      }
      expect(typeChecks).toBeInstanceOf(Function)
    })

    it("notifies observers when partner values are applied", () => {
      const manager = new FeatureFlagManager()
      const observed: Array<string | undefined> = []
      const dispose = autorun(() => observed.push(manager.getFeatureValue("partnerName")))

      manager.setPartnerFlags({ partnerName: "Example Publisher" })
      dispose()

      expect(observed).toEqual([undefined, "Example Publisher"])
    })
  })
```

What each source test guards:
- "ignores a partner flag named by the features url parameter" and "never records a partner flag for document persistence" fail at runtime if `urlFlags` accepts partner names (through `urlEnabledFlags`). The config test "drops partner flags" fails if `validateFeatureFlagConfig` does.
- "ignores a partner flag disabled by the features url parameter" and the second half of "ignores a partner flag named by the server config" fail if `isFeatureEnabled` stops reading the partner layer. Where the partner check sits in `isFeatureEnabled` is not observable while no pilot source can hold a partner name: moving it after the pilot checks leaves every test green.
- "ignores a partner flag named by the open document" and the first half of the server test are the cases Jira asks for, run end to end. Their regression guard is the type: `documentFlags` and `serverFlags` hold `PilotFlagName`, so a partner name can't be stored without a cast, and `isFeatureEnabled` answers partner flags from the partner layer before it reaches either source. The `as FeatureFlagConfig` cast in the server test is how the test gets past that type to check the behavior.

In `feature-flag-document.test.ts`, import `setUrlParams` from `../../utilities/url-params` and `FeatureFlagManager` from `./feature-flag-manager`, and add:

```ts
  it("never adds a partner flag name to a saved document", () => {
    setUrlParams(`?features=${kFlag},hideShare`)
    const manager = new FeatureFlagManager()
    manager.setPartnerFlags({ hideShare: true, partnerName: "Example Publisher" })
    const snapshot = v3Snapshot()
    addFeatureFlagGrants(snapshot, manager.urlEnabledFlags)
    setUrlParams("")
    expect((snapshot as any).content.featureFlags).toEqual([kFlag])
  })
```

---

### Partner flag documentation

**Summary**: Documents partner flags in the developer docs and updates the one other comment that describes which names a source accepts. Covers R-1758-8.

**Files affected**:
- `v3/docs/feature-flags.md`: new section after "Retiring a flag", plus one line in the introduction.
- `v3/src/utilities/url-params.ts`: the `features` comment.

**Estimated diff size**: ~60 lines

In `feature-flags.md`, after the first paragraph, add: "CODAP has two kinds of flag: **pilot flags**, described in most of this page, and **partner flags**, per-partner settings described in [Partner flags](#partner-flags)." Then add before "Not built yet":

~~~markdown
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
the flag unset. The manager's
`setPartnerFlags` replaces all partner values on each call; tests use it to set
and clear them.

Renaming or retyping a partner flag must be deliberate: a test compares the
partner flags against a list written in the test, because a config naming a flag
this build doesn't know is dropped silently.
~~~

In `url-params.ts`, the `features` comment's "Names are matched against the feature-flag registry (src/models/feature-flags/) and ignored if unrecognized." becomes "Pilot flag names, and owner names that stand for every pilot flag a project owns, are matched against the feature-flag registry (src/models/feature-flags/); partner flag names and unrecognized names are ignored."

## Open Questions

<!-- Implementation-focused questions only. Requirements questions go in requirements.md. -->

### RESOLVED: Judgment call: where partner validation lives
**Options considered**:
- A) `feature-flag-config.ts`, as Jira suggests.
- B) A new `partner-flag-values.ts`.

**Decision**: B. `feature-flag-config.ts` is the global config's fetch and `"on"`/`"off"` parsing; partner validation is about four times its size and has its own types. CODAP-1759's loader imports the new module.

### RESOLVED: Judgment call: how the sources exclude partner flags
**Options considered**:
- A) Keep `isFeatureFlagName` at each source and add an `!isPartnerFlagName` check.
- B) Switch the sources to `isPilotFlagName` and type their maps as `PilotFlagName`.

**Decision**: B. The type then makes it impossible to store a partner name in a pilot source, so a future source can't forget the filter.

### RESOLVED: Judgment call: guarding deep nesting
**Options considered**:
- A) Recursive validation inside `try`/`catch`, dropping the flag on `RangeError`.
- B) A depth limit that stops recursion.

**Decision**: B. It satisfies R-1758-4's folder limit and the "never throws" rule with one counter, and gives CFM a list it can walk.

## Self-Review

Roles: Commit Reviewer, Test Writer, Senior Engineer, Downstream Implementer (CODAP-1759, CODAP-1762 and CODAP-1763). Second round, run against the plan built in the worktree: Security Engineer, Test Writer, Senior Engineer, Downstream Implementer (adding CODAP-1760 and CODAP-1764). Round 2 of the multi-role review, again run against the full plan built in the worktree (125 tests, `build:tsc` and lint clean for these files): Mutation Tester, Senior Engineer, Security Engineer, Downstream Implementer. Round 3, run against the full plan built again in the worktree (56, 113 and 125 tests after each commit and 986 in the map, data-display and case-tile suites, all re-measured; `build:tsc` and lint clean for these files): Mutation Tester, Test Writer, Downstream Implementer, Product Owner.

### Commit Reviewer

#### RESOLVED: Does each commit build on its own?
Checked by building each state in the worktree. The first commit alone (registry, config, and the manager's pilot-only typing, with the original manager tests) passes `build:tsc` for these files, lint, and 56 tests; with the second commit, 113; with the third, 125. No step depends on a later one. The `isFeatureEnabled` read checks were in the registry test in the first draft, which would have made the first commit depend on the third; they now sit in the manager test, which the third commit adds.

---

### Test Writer

#### RESOLVED: An owner-group test could not fail
The draft had "never makes a partner flag part of an owner group". Partner entries declare `owner?: never`, so no partner flag can match any owner, whether `flagsForOwner` iterates pilot names or all names; deleting the line it was meant to guard left it green. Removed from the plan. The owner exclusion is held by the type.

#### RESOLVED: Some source tests are guarded by the type, not by their assertions
Traced each partner-source test against a mutation of the line it covers (listed under the manager tests above). The document test and the first half of the server test pass even if their source stopped filtering, because `isFeatureEnabled` answers partner flags first and the source's `PilotFlagName` type blocks storing one. They stay, since Jira asks for the document case by name, and the plan now says plainly which guard each test is.

---

### Senior Engineer

#### RESOLVED: The docs snippet broke its own fence and read backwards
The new docs section was in a ```` ```markdown ```` fence with an indented code sample inside, which would land in `feature-flags.md` as an unhighlighted block, and the sample `isFeatureEnabled("hidePlugins") || <PluginsButton />` renders `true` instead of hiding the button. The outer fence is now `~~~markdown`, the sample is a ```` ```tsx ```` block, and it reads `!isFeatureEnabled("hidePlugins") && <PluginsButton />`.

---

### Downstream Implementer

No findings. CODAP-1759 gets `kPartnerFlagNames` and `kFeatureFlags[name].type` for the manifest (R-1758-2c) and `featureFlagManager.setPartnerFlags` for the config's `flags`; CODAP-1762 and CODAP-1763 get `isFeatureEnabled`, `getFeatureValue` and the exported value types. `getFeatureValue("partnerDocuments")` is `undefined` for an empty list, so CODAP-1763's "when set" check needs no length test. CFM's read-only provider builds new metadata objects from the list and doesn't mutate it (checked in `readonly-provider.js`), so handing it the stored array is safe.

---

### Test Writer (second round)

#### RESOLVED: Two source tests were said to guard an order they can't see
The guard list said the url-disable test and the second half of the server test fail if `isFeatureEnabled` stops checking partner flags first. Built the full plan in the worktree (123 tests, `build:tsc` and lint clean for these files) and moved the partner check after the pilot checks: all 37 manager tests still passed, since no pilot source can hold a partner name. Deleting the partner check does fail them. The guard list now says they guard reading the partner layer and that the check's position is not observable.

---

### Downstream Implementer (second round)

#### RESOLVED: The docs invited a module-scope read that always sees nothing
The new docs section said a partner flag "can be read once at setup". `v3/src/index.tsx` imports `App`, and so every module, before it calls `root.render`, and CODAP-1759 holds only `root.render` until the config arrives, so a read at module scope runs before `setPartnerFlags` and always finds the flag unset. The section now names cloud-file-manager init as the read-once point and says never to read a partner flag at module scope.

---

### Senior Engineer (second round)

#### RESOLVED: The rewritten `features` comment dropped owner names
The planned `url-params.ts` comment said only pilot flag names are matched and everything else is ignored, but `urlFlags` also expands owner names (`isFeatureFlagOwner`, `flagsForOwner`), and the existing comment never mentions them. The new wording names owner names as matched too.

---

### Mutation Tester (round 2)

#### RESOLVED: The url parse step could be deleted with every test green
R-1758-5 requires a link to parse as a URL, but every rejected link in the tests fails the `https://` prefix test or the JSONP regex first. Built the plan and replaced the `try`/`new URL` block with `return !kJsonpUrlRegex.test(value)`: all 55 `partner-flag-values` tests still passed. `https://` and `https://exa mple.org/a.json` pass both other checks and throw in `new URL` (checked in Node and in Jest's jsdom), so they are now in the rejected list, and removing the parse step fails exactly those two. The `.protocol === "https:"` comparison is dropped: after the case-insensitive `https://` prefix test, a link that parses always has protocol `https:`, so the comparison can never be false. Test counts above are re-measured with the two new cases.

---

### Senior Engineer (round 2)

#### RESOLVED: The registry comment's "never empty" rule no longer names the real constraint
The comment above `kFeatureFlags` says the registry must never be empty because `keyof {}` makes every `isFeatureEnabled()` call a type error. With ten partner entries the registry can't be empty, but the pilot set can: built the plan with every pilot entry removed, and `feature-flag-config.ts` (`config[name]` is `never`), `feature-flag-manager.ts` and the registry's own owner helpers (`owner` on `never`) fail `tsc`. That will happen once the pilots graduate and the tests stop using `residualPlot` (out of scope here, but expected). The plan now rewrites the comment to require at least one pilot flag.

#### RESOLVED: The exported `isFeatureEnabled` comment says to read every flag during render
Its comment, unchanged by the plan, says to read it during render so that a late server directive takes effect. After this story it also reads boolean partner flags, which CODAP-1763 reads once in `initCfm`, a `useEffect` in `use-cloud-file-manager.ts`, and which the new docs section says may be read once at setup. The plan now replaces the comment so the render rule is stated for pilot flags and the module-scope rule for both kinds.

---

### Security Engineer (round 2)

No findings. Rechecked against CFM 2.3.1's installed `readonly-provider.js`: with the `json` option CFM uses each item's `url` unchanged (no base URL), `mapTypeToCloudMetadataType` returns `item.type` as given, so dropping `type` from documents keeps them files, and jQuery's `$.ajax` tests the same raw string the validator tests, since it rewrites only a protocol-relative `//` before the JSONP prefilter runs.

---

### Downstream Implementer (round 2)

No findings. A throwaway file confirmed `getFeatureValue` returns `string | undefined` for `partnerName`, `PartnerDocumentItem[] | undefined` for `partnerDocuments` and `IPartnerImage | undefined` for `partnerLogo`, and that assigning the logo to a string fails to compile, so CODAP-1762 and CODAP-1763 get precise types. The documents editing form is in CODAP-1760 ("Partner config authoring page: sign-in, storage, release, editing form and links"), so that story is the one that should know the 10-level folder limit.

---

### Mutation Tester (round 3)

#### RESOLVED: Deleting the validation in `setPartnerFlags` left every test green
R-1758-3a's guarantee that an invalid value never reaches the manager rests on one line, `this.partnerFlags = validatePartnerFlags(flags)`. Built the plan and replaced it with `this.partnerFlags = flags as PartnerFlagValues`: all 125 tests still passed. The invalid `hidePlugins: "yes"` in "applies the valid values of a partner config" can't show the difference, because `isFeatureEnabled` compares with `=== true`. That test now also passes `partnerStorageDemoLabel: 7` and expects `getFeatureValue("partnerStorageDemoLabel")` to be `undefined`; with the mutation it fails, and without it the suite still has 125 passing tests.

---

### Test Writer (round 3)

#### RESOLVED: Two loops in "splits every flag into exactly one kind" were true by construction
`kPartnerFlagNames` is `kFeatureFlagNames.filter(isPartnerFlagName)` and `kPilotFlagNames` filters by `isPilotFlagName`, which is defined as not a partner name, so `isPartnerFlagName` is true for every partner name and false for every pilot name whatever it does. Built the plan and broke `isPartnerFlagName` (a name counts as partner only if it starts with `hide`): the test still passed, and only the frozen-names test caught it. The remaining loop line, `isPilotFlagName` false for partner names, is implied by the union check: making `isPilotFlagName` accept partner names fails that check first. The loops are removed; the length checks, the union check and the unknown-name checks stay, and the trimmed test still fails on that `isPilotFlagName` mutation.

---

### Downstream Implementer (round 3)

#### RESOLVED: The docs table left out the rules a form author needs
The new docs section's types table said nothing of the 10-level folder limit (`kMaxPartnerFolderDepth`, which drops deeper folders in the built plan), the logo file-name rule, blank alt text or blank item names, and gave the `url` rule without the parse step. Round 1 expected the authoring-page work (now CODAP-1760) to learn the folder limit from this story; the developer docs are where it would look. The `url`, `image` and `documents` rows now state those rules.

---

### Product Owner (round 3)

#### RESOLVED: The `hideShare` description missed "Revert to shared view"
CODAP-1763's Jira text hides the whole Share entry "together with File > Revert > 'Revert to shared view'", and `getFileMenuConfig` in `use-cloud-file-manager.ts` puts that item in the "Revert to" submenu, outside Share. The registry description said only "Hides the Share menu and its items" (the stream's wording; Jira wins). It now names both.

