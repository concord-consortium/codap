# CODAP-1595: Open-Source Libraries List Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fill in the About dialog's Open-source libraries view with a searchable list of bundled packages,
generate `THIRD-PARTY-NOTICES.md` at build time, and show a project count on the About view's button.

**Architecture:** `webpack-license-plugin` collects every package in the bundle during each webpack build and
writes `oss-licenses.json`, plus two files formatted by `v3/scripts/oss-licenses.js`: `oss-libraries.json`
(the dialog's list) and `THIRD-PARTY-NOTICES.md`. Both are emitted next to `index.html` and deployed with it.
The dialog fetches the list through a `useOssLibraries()` hook, using `getBuildAssetUrl()` so URLs resolve
into the version folder even on promoted pages.

**Tech Stack:** webpack 5, `webpack-license-plugin`, React 18, TypeScript, Chakra UI v2, Jest + React Testing
Library, Cypress.

**Design doc:** `v3/docs/plans/2026-11-02-codap-1595-oss-libraries-design.md`

---

## Conventions for every task

- Run npm/jest/lint commands from `v3/`. Run git commands from the repo root (`v3`'s parent).
- No semicolons; max line length 120.
- **Commits:** per CLAUDE.md, show the user the proposed commit message and get explicit approval before
  every commit. The messages below are proposals. End each with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- **Cypress from Claude Code in VS Code:** run with `env -u ELECTRON_RUN_AS_NODE`, or Cypress won't start.
- **Dev server:** the user runs it (`npm start`, http://localhost:8080). Changes to `webpack.config.js` need a
  dev server restart; ask the user to restart it.

## Deviations from the design doc (found while planning)

1. **NOTICE files.** Apache-2.0 requires redistributing a package's `NOTICE` file. The plugin's
   `includeNoticeText` option collects them, and `THIRD-PARTY-NOTICES.md` includes them after the license text.
2. **Plural strings.** `translate()` doesn't pluralize. Following the existing `DG.*Plural` convention, counts
   use a singular key and a `…Plural` key: `V3.AboutDialog.projectCount` / `projectCountPlural` and
   `V3.AboutDialog.libraries.resultCount` / `resultCountPlural`.
3. **Retry after failure.** If the list fails to load, the cached request is cleared, so reopening the dialog
   tries again instead of staying in the error state for the session.
4. **Existing dialog tests** find the acknowledgements button by test id, since its accessible name now
   includes the project count once the list loads.

---

### Task 1: Add the plugin (validation spike)

**Files:**
- Modify: `v3/package.json`, `v3/package-lock.json`
- Modify: `v3/webpack.config.js` (requires at the top; `webpackPlugins` array ~line 88)

**Step 1: Record a baseline build time**

Run: `time npm run build:webpack`
Expected: succeeds. Note the real time (the persistent cache is warm after the first run, so run it twice and
note the second).

**Step 2: Install the plugin**

Run: `npm install --save-dev webpack-license-plugin`
Expected: `package.json` `devDependencies` gains `"webpack-license-plugin": "^4.5.1"` (or newer 4.x).

**Step 3: Register it with no custom files yet**

In `webpack.config.js`, with the other requires:

```js
const LicensePlugin = require('webpack-license-plugin')
```

If the build later fails with "LicensePlugin is not a constructor", use
`require('webpack-license-plugin').default`.

In `webpackPlugins`, after `new CleanWebpackPlugin(),`:

```js
    // Lists the third-party packages in the bundle, with their licenses, for the About dialog
    new LicensePlugin({
      includeNoticeText: true,
      // the Rollbar snippet is inlined into index.html by file path, so it isn't in the module graph
      includePackages: () => [path.join(__dirname, 'node_modules/rollbar')],
      replenishDefaultLicenseTexts: true,
    }),
```

**Step 4: Build and inspect**

Run: `time npm run build:webpack 2>&1 | tee /tmp/oss-build.log`
Expected: succeeds. Note any plugin warnings about invalid license expressions, and the build time.

Then summarize the output:

```bash
node -e '
const pkgs = require("./dist/oss-licenses.json")
const byLicense = {}
pkgs.forEach(p => { byLicense[p.license] = (byLicense[p.license] || 0) + 1 })
console.log("packages:", pkgs.length)
console.log("licenses:", byLicense)
console.log("no license text:", pkgs.filter(p => !p.licenseText).map(p => `${p.name}@${p.version}`))
console.log("with notice text:", pkgs.filter(p => p.noticeText).map(p => `${p.name}@${p.version}`))
console.log("has rollbar:", pkgs.some(p => p.name === "rollbar"))
'
```

**Step 5: STOP and report to the user**

Report: package count, license breakdown, invalid-license warnings, packages without license text, packages
with notices, whether `rollbar` is included, and the build time difference. Include anything that looks like
a licensing concern (e.g. GPL-family licenses). Wait for the user before continuing.

**Step 6: Add overrides (if needed)**

For each package with an invalid license expression, check its license file by hand and add an entry:

```js
      licenseOverrides: {
        // "<name>@<version>": "<SPDX expression>",  // why: what the license file says
      },
```

Rebuild and confirm the warnings are gone.

**Step 7: Commit** (after user approves the message)

```bash
git add v3/package.json v3/package-lock.json v3/webpack.config.js
git commit -m "CODAP-1595: add webpack-license-plugin to list bundled packages"
```

---

### Task 2: Format `oss-libraries.json` and `THIRD-PARTY-NOTICES.md`

**Files:**
- Create: `v3/scripts/oss-licenses.js`
- Test: `v3/scripts/oss-licenses.test.js`
- Modify: `v3/webpack.config.js`

These are CommonJS files because `webpack.config.js` is CommonJS. Jest runs `.js` files untransformed, which
works for CommonJS.

**Step 1: Write the failing tests**

`scripts/oss-licenses.test.js`:

```js
const { ossLibrariesJson, thirdPartyNoticesMarkdown } = require("./oss-licenses")

const packages = [
  { name: "react", version: "18.3.1", license: "MIT", repository: "https://github.com/facebook/react",
    licenseText: "MIT License\n\nCopyright (c) Meta" },
  { name: "@chakra-ui/react", version: "2.8.2", license: "MIT", licenseText: "MIT License (Chakra)" },
  { name: "d3", version: "7.9.0", license: "ISC", repository: "https://github.com/d3/d3",
    licenseText: "Copyright 2010-2023 Mike Bostock\n```\ncode fence in the text\n```" },
  { name: "some-apache-lib", version: "1.0.0", license: "Apache-2.0", licenseText: "Apache License",
    noticeText: "This product includes software developed by Someone." },
  { name: "no-text", version: "0.1.0" }
]

describe("ossLibrariesJson", () => {
  it("lists name, version, and license, sorted by name, without license text", () => {
    expect(JSON.parse(ossLibrariesJson(packages))).toEqual([
      { name: "@chakra-ui/react", version: "2.8.2", license: "MIT" },
      { name: "d3", version: "7.9.0", license: "ISC" },
      { name: "no-text", version: "0.1.0", license: "Unknown" },
      { name: "react", version: "18.3.1", license: "MIT" },
      { name: "some-apache-lib", version: "1.0.0", license: "Apache-2.0" }
    ])
  })

  it("lists each version of a package separately", () => {
    const libraries = JSON.parse(ossLibrariesJson([
      { name: "tslib", version: "2.6.0", license: "0BSD" },
      { name: "tslib", version: "1.14.1", license: "0BSD" }
    ]))
    expect(libraries.map(library => library.version)).toEqual(["1.14.1", "2.6.0"])
  })
})

describe("thirdPartyNoticesMarkdown", () => {
  const markdown = thirdPartyNoticesMarkdown(packages)

  it("has a section for every package, in name order", () => {
    const headings = markdown.split("\n").filter(line => line.startsWith("## "))
    expect(headings).toEqual([
      "## @chakra-ui/react 2.8.2",
      "## d3 7.9.0",
      "## no-text 0.1.0",
      "## react 18.3.1",
      "## some-apache-lib 1.0.0"
    ])
  })

  it("includes the license, repository, and license text", () => {
    expect(markdown).toContain("- License: MIT")
    expect(markdown).toContain("- Repository: https://github.com/facebook/react")
    expect(markdown).toContain("Copyright (c) Meta")
  })

  it("fences license text so code fences inside it can't break the file", () => {
    expect(markdown).toContain("````\nCopyright 2010-2023 Mike Bostock\n```\ncode fence in the text\n```\n````")
  })

  it("includes NOTICE text", () => {
    expect(markdown).toContain("This product includes software developed by Someone.")
  })

  it("says when a package has no license text", () => {
    expect(markdown).toContain("- License: Unknown")
    expect(markdown).toContain("No license text was found for this package.")
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- scripts/oss-licenses`
Expected: FAIL (cannot find module `./oss-licenses`)

**Step 3: Implement**

`scripts/oss-licenses.js`:

```js
// Formats the files that webpack-license-plugin writes next to index.html (see webpack.config.js).
// Each function receives the plugin's package list: [{ name, version, license, repository, licenseText,
// noticeText }], where everything but name and version may be missing.

// Code-unit order rather than localeCompare, so the output doesn't depend on the build machine's locale.
function compareStrings(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

function compareLibraries(a, b) {
  return compareStrings(a.name, b.name) || compareStrings(a.version, b.version)
}

function licenseOf(pkg) {
  return pkg.license || "Unknown"
}

// Wraps text in a code fence longer than any run of backticks inside it.
function fence(text) {
  const longestRun = Math.max(0, ...(text.match(/`+/g) || []).map(run => run.length))
  const ticks = "`".repeat(Math.max(3, longestRun + 1))
  return `${ticks}\n${text.trim()}\n${ticks}`
}

// The About dialog's list: name, version, and license only, sorted by name.
function ossLibrariesJson(packages) {
  const libraries = [...packages]
    .sort(compareLibraries)
    .map(pkg => ({ name: pkg.name, version: pkg.version, license: licenseOf(pkg) }))
  return JSON.stringify(libraries)
}

// The full license (and NOTICE) text of every package, linked from the About dialog.
function thirdPartyNoticesMarkdown(packages) {
  const sections = [...packages].sort(compareLibraries).map(pkg => {
    const lines = [`## ${pkg.name} ${pkg.version}`, "", `- License: ${licenseOf(pkg)}`]
    if (pkg.repository) lines.push(`- Repository: ${pkg.repository}`)
    lines.push("", pkg.licenseText ? fence(pkg.licenseText) : "No license text was found for this package.")
    if (pkg.noticeText) lines.push("", "Notice:", "", fence(pkg.noticeText))
    return lines.join("\n")
  })
  return [
    "# Third-Party Notices",
    "CODAP includes the following open-source software. Each package's license and notices are reproduced below.",
    ...sections
  ].join("\n\n") + "\n"
}

module.exports = { ossLibrariesJson, thirdPartyNoticesMarkdown }
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- scripts/oss-licenses`
Expected: PASS (7 tests)

**Step 5: Wire into the plugin**

In `webpack.config.js`, with the other requires:

```js
// keep these file names in sync with src/components/about-dialog/about-dialog-constants.ts
const { ossLibrariesJson, thirdPartyNoticesMarkdown } = require('./scripts/oss-licenses')
```

Add to the `LicensePlugin` options:

```js
      additionalFiles: {
        'oss-libraries.json': ossLibrariesJson,
        'THIRD-PARTY-NOTICES.md': thirdPartyNoticesMarkdown,
      },
```

**Step 6: Verify the build output**

Run: `npm run build:webpack`
Then: `ls -la dist/oss-libraries.json dist/THIRD-PARTY-NOTICES.md && head -c 300 dist/oss-libraries.json && head -30 dist/THIRD-PARTY-NOTICES.md`
Expected: both files exist; the JSON starts with a scoped package (`@…`), and the Markdown starts with
"# Third-Party Notices" followed by package sections.

**Step 7: Commit** (after user approves the message)

```bash
git add v3/scripts/oss-licenses.js v3/scripts/oss-licenses.test.js v3/webpack.config.js
git commit -m "CODAP-1595: generate oss-libraries.json and THIRD-PARTY-NOTICES.md at build time"
```

---

### Task 3: `getBuildAssetUrl()`

**Files:**
- Modify: `v3/src/utilities/urls.ts`
- Modify: `v3/src/global.d.ts`
- Test: `v3/src/utilities/urls.test.ts`

**Step 1: Write the failing tests**

In `urls.test.ts`, add `getBuildAssetUrl` to the import, and inside `describe("urls", ...)`:

```ts
  describe("getBuildAssetUrl", () => {
    afterEach(() => {
      delete (globalThis as any).__webpack_public_path__
    })

    it("resolves against webpack's public path", () => {
      ;(globalThis as any).__webpack_public_path__ = "https://example.com/codap3/version/v3.1.2/"
      expect(getBuildAssetUrl("THIRD-PARTY-NOTICES.md"))
        .toBe("https://example.com/codap3/version/v3.1.2/THIRD-PARTY-NOTICES.md")
    })

    it("returns the file name when there is no public path (e.g. in Jest)", () => {
      expect(getBuildAssetUrl("oss-libraries.json")).toBe("oss-libraries.json")
    })
  })
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/utilities/urls.test.ts`
Expected: FAIL (`getBuildAssetUrl` is not exported)

**Step 3: Implement**

In `global.d.ts`, after the `process` declaration:

```ts
// The URL of the folder the bundle was loaded from, set by webpack at runtime.
declare const __webpack_public_path__: string | undefined
```

In `urls.ts`:

```ts
// Returns the URL of a file the build emits next to index.html. Pages promoted to the top level (production,
// beta, staging) load their scripts from a version folder, so a plain relative URL would point to the wrong
// place. Webpack's public path is the folder the bundle was actually loaded from.
export function getBuildAssetUrl(filename: string) {
  return typeof __webpack_public_path__ === "string" ? `${__webpack_public_path__}${filename}` : filename
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/utilities/urls.test.ts`
Expected: PASS

Run: `npm run build:tsc`
Expected: no errors

**Step 5: Commit** (after user approves the message)

```bash
git add v3/src/utilities/urls.ts v3/src/utilities/urls.test.ts v3/src/global.d.ts
git commit -m "CODAP-1595: add getBuildAssetUrl for files emitted next to index.html"
```

---

### Task 4: `useOssLibraries()` hook

**Files:**
- Modify: `v3/src/components/about-dialog/about-dialog-constants.ts`
- Create: `v3/src/components/about-dialog/use-oss-libraries.ts`
- Test: `v3/src/components/about-dialog/use-oss-libraries.test.ts`

**Step 1: Add file-name constants**

In `about-dialog-constants.ts`, add (leave `kThirdPartyNoticesUrl` for now; Task 6 removes it when
`about-dialog.tsx` stops using it):

```ts
// files the build emits next to index.html (see webpack.config.js); load them with getBuildAssetUrl()
export const kOssLibrariesFile = "oss-libraries.json"
export const kThirdPartyNoticesFile = "THIRD-PARTY-NOTICES.md"
```

**Step 2: Write the failing tests**

`use-oss-libraries.test.ts`:

```ts
import { renderHook, waitFor } from "@testing-library/react"
import { IOssLibrary, resetOssLibrariesRequest, useOssLibraries } from "./use-oss-libraries"

const kLibraries: IOssLibrary[] = [{ name: "d3", version: "7.9.0", license: "ISC" }]

function mockFetch(response: Partial<Response>) {
  global.fetch = jest.fn().mockResolvedValue(response)
}

describe("useOssLibraries", () => {
  beforeEach(() => {
    resetOssLibrariesRequest()
  })

  it("loads the library list", async () => {
    mockFetch({ ok: true, json: () => Promise.resolve(kLibraries) })
    const { result } = renderHook(() => useOssLibraries(true))
    expect(result.current).toEqual({ status: "loading" })
    await waitFor(() => expect(result.current).toEqual({ status: "loaded", libraries: kLibraries }))
    expect(global.fetch).toHaveBeenCalledWith("oss-libraries.json")
  })

  it("doesn't fetch until enabled", () => {
    mockFetch({ ok: true, json: () => Promise.resolve(kLibraries) })
    renderHook(() => useOssLibraries(false))
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("reports an error when the request fails", async () => {
    mockFetch({ ok: false, status: 404 })
    const { result } = renderHook(() => useOssLibraries(true))
    await waitFor(() => expect(result.current).toEqual({ status: "error" }))
  })

  it("reuses the request", async () => {
    mockFetch({ ok: true, json: () => Promise.resolve(kLibraries) })
    const first = renderHook(() => useOssLibraries(true))
    await waitFor(() => expect(first.result.current.status).toBe("loaded"))
    const second = renderHook(() => useOssLibraries(true))
    await waitFor(() => expect(second.result.current.status).toBe("loaded"))
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it("tries again after a failure", async () => {
    mockFetch({ ok: false, status: 500 })
    const first = renderHook(() => useOssLibraries(true))
    await waitFor(() => expect(first.result.current.status).toBe("error"))
    mockFetch({ ok: true, json: () => Promise.resolve(kLibraries) })
    const second = renderHook(() => useOssLibraries(true))
    await waitFor(() => expect(second.result.current.status).toBe("loaded"))
  })
})
```

**Step 3: Run tests to verify they fail**

Run: `npm test -- use-oss-libraries`
Expected: FAIL (cannot find module `./use-oss-libraries`)

**Step 4: Implement**

`use-oss-libraries.ts`:

```ts
import { useEffect, useState } from "react"
import { getBuildAssetUrl } from "../../utilities/urls"
import { kOssLibrariesFile } from "./about-dialog-constants"

export interface IOssLibrary {
  name: string
  version: string
  license: string
}

export type OssLibrariesState =
  { status: "loading" } | { status: "loaded", libraries: IOssLibrary[] } | { status: "error" }

// shared by every use of the hook, so the list is only fetched once per session
let librariesRequest: Maybe<Promise<IOssLibrary[]>>

// exported for testing
export function resetOssLibrariesRequest() {
  librariesRequest = undefined
}

function requestOssLibraries() {
  if (!librariesRequest) {
    librariesRequest = fetch(getBuildAssetUrl(kOssLibrariesFile)).then(response => {
      if (!response.ok) throw new Error(`Unable to load ${kOssLibrariesFile} (${response.status})`)
      return response.json() as Promise<IOssLibrary[]>
    })
    // let a later use try again after a failure
    librariesRequest.catch(() => { resetOssLibrariesRequest() })
  }
  return librariesRequest
}

// Loads the list of bundled third-party packages once `enabled` is true.
export function useOssLibraries(enabled: boolean): OssLibrariesState {
  const [state, setState] = useState<OssLibrariesState>({ status: "loading" })

  useEffect(() => {
    if (!enabled) return
    let isCurrent = true
    requestOssLibraries()
      .then(libraries => isCurrent && setState({ status: "loaded", libraries }))
      .catch(() => isCurrent && setState({ status: "error" }))
    return () => { isCurrent = false }
  }, [enabled])

  return state
}
```

**Step 5: Run tests to verify they pass**

Run: `npm test -- use-oss-libraries`
Expected: PASS (5 tests)

**Step 6: Commit** (after user approves the message)

```bash
git add v3/src/components/about-dialog/about-dialog-constants.ts \
  v3/src/components/about-dialog/use-oss-libraries.ts v3/src/components/about-dialog/use-oss-libraries.test.ts
git commit -m "CODAP-1595: add useOssLibraries hook"
```

---

### Task 5: Strings

**Files:**
- Modify: `v3/src/utilities/translation/lang/en-US.json5` (after `V3.AboutDialog.acknowledgementsButton` and
  after `V3.AboutDialog.libraries.noticesLink`)

**Step 1: Add strings**

After `"V3.AboutDialog.acknowledgementsButton": …,`:

```json5
    "V3.AboutDialog.projectCount": "1 project",
    "V3.AboutDialog.projectCountPlural": "%{count} projects",
```

After `"V3.AboutDialog.libraries.noticesLink": "THIRD-PARTY-NOTICES"` (add a comma to that line):

```json5
    "V3.AboutDialog.libraries.searchLabel": "Search libraries…",
    "V3.AboutDialog.libraries.resultCount": "1 library",
    "V3.AboutDialog.libraries.resultCountPlural": "%{count} libraries",
    "V3.AboutDialog.libraries.loading": "Loading libraries…",
    "V3.AboutDialog.libraries.noMatches": "No libraries match “%{query}”.",
    "V3.AboutDialog.libraries.loadError": "The library list couldn't be loaded."
```

**Step 2: Verify**

Run: `npm test -- translate`
Expected: PASS

**Step 3: Commit** (after user approves the message)

```bash
git add v3/src/utilities/translation/lang/en-US.json5
git commit -m "CODAP-1595: add open-source libraries list strings"
```

---

### Task 6: Dialog: project count, list, and search

**Files:**
- Modify: `v3/src/components/about-dialog/about-dialog.tsx`
- Modify: `v3/src/components/about-dialog/about-dialog.scss`
- Test: `v3/src/components/about-dialog/about-dialog.test.tsx`

**Step 1: Update the existing tests for fetching**

The dialog now fetches the list when it opens, so every test needs a mocked `fetch`, and the button's accessible
name now includes the count.

At the top of `about-dialog.test.tsx`, add `act` to the `@testing-library/react` import and add:

```tsx
import { IOssLibrary, resetOssLibrariesRequest } from "./use-oss-libraries"

const kLibraries: IOssLibrary[] = [
  { name: "@chakra-ui/react", version: "2.8.2", license: "MIT" },
  { name: "d3", version: "7.9.0", license: "ISC" },
  { name: "mobx", version: "6.12.3", license: "MIT" },
  { name: "mobx-state-tree", version: "5.4.1", license: "MIT" }
]

function mockFetch(result: IOssLibrary[] | "error" | "pending") {
  global.fetch = jest.fn().mockImplementation(() => {
    if (result === "pending") return new Promise(() => undefined)
    if (result === "error") return Promise.resolve({ ok: false, status: 404 })
    return Promise.resolve({ ok: true, json: () => Promise.resolve(result) })
  })
}

// lets the mocked fetch resolve and the dialog re-render
async function flushFetch() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
}

function getAcknowledgementsButton() {
  return screen.getByTestId("about-dialog-acknowledgements")
}
```

Inside `describe("AboutDialog", ...)`, before the first nested `describe`:

```tsx
  beforeEach(() => {
    resetOssLibrariesRequest()
    mockFetch(kLibraries)
  })
```

Make `setup()` async and flush the fetch:

```tsx
async function setup() {
  const user = userEvent.setup()
  const onClose = jest.fn()
  const view = render(<AboutDialog isOpen={true} onClose={onClose}/>)
  await flushFetch()
  return { user, onClose, ...view }
}
```

Then, throughout the existing tests:
- `setup()` → `await setup()` (make each `it` callback `async` where it isn't already).
- `screen.getByRole("button", { name: "Open-source libraries & acknowledgements" })` →
  `getAcknowledgementsButton()`.
- In "returns focus to the Help menu button", add `await flushFetch()` after `render(<Harness/>)`.

**Step 2: Write the failing tests**

Add a new `describe` inside `describe("AboutDialog", ...)`:

```tsx
  describe("open-source libraries", () => {
    async function showLibraries() {
      const setupResult = await setup()
      await setupResult.user.click(getAcknowledgementsButton())
      return setupResult
    }

    it("shows the project count on the acknowledgements button", async () => {
      await setup()
      expect(getAcknowledgementsButton()).toHaveTextContent("4 projects")
    })

    it.each([["pending"], ["error"]] as const)("omits the project count when the list is %s", async result => {
      mockFetch(result)
      await setup()
      expect(getAcknowledgementsButton()).not.toHaveTextContent("projects")
    })

    it("lists each library's name, version, and license", async () => {
      await showLibraries()
      const rows = screen.getAllByRole("listitem")
      expect(rows).toHaveLength(4)
      expect(rows[1]).toHaveTextContent("d3")
      expect(rows[1]).toHaveTextContent("7.9.0")
      expect(rows[1]).toHaveTextContent("ISC")
    })

    it("filters by name, ignoring case", async () => {
      const { user } = await showLibraries()
      await user.type(screen.getByRole("textbox", { name: "Search libraries…" }), "MOBX")
      const rows = screen.getAllByRole("listitem")
      expect(rows).toHaveLength(2)
      expect(rows[0]).toHaveTextContent("mobx")
      expect(screen.getByText("2 libraries")).toHaveAttribute("aria-live", "polite")
    })

    it("filters by license", async () => {
      const { user } = await showLibraries()
      await user.type(screen.getByRole("textbox", { name: "Search libraries…" }), "isc")
      expect(screen.getAllByRole("listitem")).toHaveLength(1)
      expect(screen.getByText("1 library")).toBeInTheDocument()
    })

    it("says when nothing matches", async () => {
      const { user } = await showLibraries()
      await user.type(screen.getByRole("textbox", { name: "Search libraries…" }), "zzz")
      expect(screen.queryByRole("listitem")).not.toBeInTheDocument()
      expect(screen.getByText("No libraries match “zzz”.")).toBeInTheDocument()
    })

    it("says when the list is loading", async () => {
      mockFetch("pending")
      await showLibraries()
      expect(screen.getByText("Loading libraries…")).toBeInTheDocument()
    })

    it("says when the list couldn't be loaded, and still links to the notices", async () => {
      mockFetch("error")
      await showLibraries()
      expect(screen.getByText("The library list couldn't be loaded.")).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "THIRD-PARTY-NOTICES (opens in a new tab)" }))
        .toHaveAttribute("href", "THIRD-PARTY-NOTICES.md")
    })
  })
```

Also update the existing libraries-view test's notices link assertion, since the link is no longer on GitHub:

```tsx
      expect(noticesLink).toHaveAttribute("href", "THIRD-PARTY-NOTICES.md")
```

**Step 3: Run tests to verify they fail**

Run: `npm test -- about-dialog.test`
Expected: the existing tests pass except the notices-link `href` assertion; the new "open-source libraries"
tests fail (no count, no list).

**Step 4: Implement**

In `about-dialog.tsx`:

Imports — update the Chakra import and the constants import, and add the hook and URL helper:

```tsx
import { Badge, Button, Input, ModalBody, ModalCloseButton, ModalFooter, ModalHeader, VisuallyHidden }
  from "@chakra-ui/react"
import React, { useEffect, useMemo, useRef, useState } from "react"
```

```tsx
import { getBuildAssetUrl } from "../../utilities/urls"
```

```tsx
import {
  kLicensingDetailsUrl, kLicensingEmail, kLicensingUrl, kMitLicenseUrl, kSourceCodeUrl, kTermsOfUseUrl,
  kThirdPartyNoticesFile
} from "./about-dialog-constants"
import { IOssLibrary, OssLibrariesState, useOssLibraries } from "./use-oss-libraries"
```

In `AboutDialog`, after the state and refs:

```tsx
  const librariesState = useOssLibraries(isOpen)
```

Pass it to both views:

```tsx
          {view === "about"
            ? <AboutView acknowledgementsButtonRef={acknowledgementsButtonRef} librariesState={librariesState}
                onShowLibraries={() => showView("libraries")}/>
            : <LibrariesView librariesState={librariesState}/>
          }
```

`AboutView`: add `librariesState: OssLibrariesState` to `IAboutViewProps` and the destructured props, and
replace the acknowledgements button:

```tsx
      <Button ref={acknowledgementsButtonRef} variant="v3Clear" size="sm" width="100%" mt="3"
          justifyContent="space-between" onClick={onShowLibraries} data-testid="about-dialog-acknowledgements">
        {t("V3.AboutDialog.acknowledgementsButton")}{" "}
        <span>
          {librariesState.status === "loaded" && `${projectCountText(librariesState.libraries.length)} `}
          <span aria-hidden="true">›</span>
        </span>
      </Button>
```

Add these helpers above `AboutView`:

```tsx
function projectCountText(count: number) {
  return count === 1
    ? t("V3.AboutDialog.projectCount")
    : t("V3.AboutDialog.projectCountPlural", { vars: { count } })
}

function resultCountText(count: number) {
  return count === 1
    ? t("V3.AboutDialog.libraries.resultCount")
    : t("V3.AboutDialog.libraries.resultCountPlural", { vars: { count } })
}

function matchesQuery(library: IOssLibrary, lowerCaseQuery: string) {
  return library.name.toLowerCase().includes(lowerCaseQuery) ||
    library.license.toLowerCase().includes(lowerCaseQuery)
}
```

Replace `LibrariesView`:

```tsx
interface ILibrariesViewProps {
  librariesState: OssLibrariesState
}

function LibrariesView({ librariesState }: ILibrariesViewProps) {
  const [query, setQuery] = useState("")
  const lowerCaseQuery = query.trim().toLowerCase()
  const matches = useMemo(() => {
    if (librariesState.status !== "loaded") return []
    return librariesState.libraries.filter(library => matchesQuery(library, lowerCaseQuery))
  }, [librariesState, lowerCaseQuery])

  function renderLibraries() {
    if (librariesState.status === "loading") {
      return <p className="about-dialog-library-status">{t("V3.AboutDialog.libraries.loading")}</p>
    }
    if (librariesState.status === "error") {
      return <p className="about-dialog-library-status">{t("V3.AboutDialog.libraries.loadError")}</p>
    }
    if (matches.length === 0) {
      return (
        <p className="about-dialog-library-status">
          {t("V3.AboutDialog.libraries.noMatches", { vars: { query: query.trim() } })}
        </p>
      )
    }
    return (
      <ul>
        {matches.map(({ name, version, license }) => (
          <li key={`${name}@${version}`} className="about-dialog-library">
            <span className="about-dialog-library-name">{name}</span>
            <span>{version}</span>
            <Badge>{license}</Badge>
          </li>
        ))}
      </ul>
    )
  }

  const searchLabel = t("V3.AboutDialog.libraries.searchLabel")
  return (
    <>
      <p>{t("V3.AboutDialog.libraries.intro")}</p>
      <Input size="sm" mt="3" value={query} onChange={e => setQuery(e.target.value)}
        placeholder={searchLabel} aria-label={searchLabel} data-testid="about-dialog-library-search"/>
      <div className="about-dialog-library-list">
        {renderLibraries()}
      </div>
      <VisuallyHidden aria-live="polite">
        {librariesState.status === "loaded" ? resultCountText(matches.length) : ""}
      </VisuallyHidden>
      <p className="about-dialog-libraries-footer">
        {translateToElements("V3.AboutDialog.libraries.footer", {
          noticesLink:
            <ExternalLink href={getBuildAssetUrl(kThirdPartyNoticesFile)} showArrow={true}>
              {t("V3.AboutDialog.libraries.noticesLink")}
            </ExternalLink>
        })}
      </p>
    </>
  )
}
```

Add to `about-dialog.scss`, inside `.about-dialog-body` (before `.about-dialog-libraries-footer`):

```scss
  .about-dialog-library-list {
    border: 1px solid #E2E6EA;
    border-radius: 6px;
    margin-top: 8px;
    max-height: 300px;
    overflow-y: auto;
  }

  .about-dialog-library {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;

    & + .about-dialog-library {
      border-top: 1px solid #E2E6EA;
    }
  }

  .about-dialog-library-name {
    flex: 1;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .about-dialog-library-status {
    padding: 12px;
  }
```

In `about-dialog-constants.ts`, delete `kThirdPartyNoticesUrl`, which nothing uses now.

**Step 5: Run tests to verify they pass**

Run: `npm test -- about-dialog`
Expected: PASS (all `about-dialog.test.tsx` and `use-oss-libraries.test.ts` tests), with no `act()` warnings.

Run: `npm run build:tsc && npx eslint src/components/about-dialog/`
Expected: no errors

**Step 6: Commit** (after user approves the message)

```bash
git add v3/src/components/about-dialog/
git commit -m "CODAP-1595: show the open-source libraries list in the About dialog"
```

---

### Task 7: Cypress

**Files:**
- Modify: `v3/cypress/e2e/about-dialog.spec.ts`

The dev server must have been restarted since Task 2's `webpack.config.js` change, so it serves
`oss-libraries.json`.

**Step 1: Add a test**

After the existing `it(...)`:

```ts
  it("lists the bundled open-source libraries and filters them", () => {
    cfm.getHelpMenuButton().click()
    cfm.getHelpMenu().contains(".menuItem", "About CODAP").click()

    cy.get("[data-testid=about-dialog-acknowledgements]").should("contain.text", "projects").click()
    cy.get(".about-dialog-library").should("have.length.greaterThan", 10)
    cy.contains(".about-dialog-library-name", /^react$/).should("exist")

    cy.get("[data-testid=about-dialog-library-search]").type("mobx")
    cy.get(".about-dialog-library-name").each(name => {
      expect(name.text().toLowerCase()).to.contain("mobx")
    })
  })
```

**Step 2: Run it**

Run: `env -u ELECTRON_RUN_AS_NODE npm run test:cypress -- --spec cypress/e2e/about-dialog.spec.ts`
Expected: PASS (2 tests)

**Step 3: Commit** (after user approves the message)

```bash
git add v3/cypress/e2e/about-dialog.spec.ts
git commit -m "CODAP-1595: add Cypress test for the open-source libraries list"
```

---

### Task 8: Update docs

**Files:**
- Modify: `v3/docs/plans/2026-10-30-codap-1595-about-dialog-design.md`
- Modify: `v3/doc/deploy.md`

**Step 1: About dialog design doc**

- In the Links table, change the THIRD-PARTY-NOTICES row's URL to "`THIRD-PARTY-NOTICES.md` next to
  `index.html`, via `getBuildAssetUrl()` (see the open-source libraries design)".
- In Out of scope, replace the "Open-source library list" bullet with: "The open-source library list and
  `THIRD-PARTY-NOTICES.md`: see `2026-11-02-codap-1595-oss-libraries-design.md`."

**Step 2: `doc/deploy.md`**

Add after the first paragraph:

```markdown
Each build also writes `oss-licenses.json`, `oss-libraries.json`, and `THIRD-PARTY-NOTICES.md` next to
`index.html` (see `webpack-license-plugin` in `webpack.config.js`). The About dialog loads them with
`getBuildAssetUrl()`, so pages promoted to the top level still load them from their version folder.
```

**Step 3: Commit** (after user approves the message)

```bash
git add v3/docs/plans/2026-10-30-codap-1595-about-dialog-design.md v3/doc/deploy.md
git commit -m "CODAP-1595: document the generated license files"
```

---

### Task 9: Full verification

This also covers Task 11 of the About dialog plan, which hasn't run yet.

**Step 1: Automated checks**

- `npm run lint` — no errors
- `npm run build:tsc` — no errors
- `npm test` — all pass
- `npm run build:webpack` — succeeds; `dist/` contains `oss-licenses.json`, `oss-libraries.json`, and
  `THIRD-PARTY-NOTICES.md`
- `env -u ELECTRON_RUN_AS_NODE npm run test:cypress -- --spec cypress/e2e/about-dialog.spec.ts,cypress/e2e/tool-shelf.spec.ts`
  — all pass

**Step 2: Manual check in the browser** (dev server, http://localhost:8080)

The About dialog checklist from the first plan:

- [ ] Help menu: separator above "About CODAP…", with the info icon matching the other menu icons
- [ ] Dialog is centered and can't be dragged
- [ ] Header matches other v3 modals and the × lines up
- [ ] Logo is sharp; links look like links and open in new tabs; the email link opens a mail client
- [ ] Keyboard only: Tab stays inside the dialog; Esc closes; focus returns to the Help menu button
- [ ] Another `CodapModal` (e.g. table → Info) is still draggable at its usual position
- [ ] Screen reader (VoiceOver: Cmd+F5): dialog announced as "About CODAP"; links say "opens in a new tab"

The libraries list:

- [ ] The button shows "N projects"; the list scrolls within the dialog; long names wrap
- [ ] Search narrows the list as you type; VoiceOver announces the result count
- [ ] The THIRD-PARTY-NOTICES link opens the notices file from the dev server

**Step 3: After pushing the branch** (the user pushes, or approves a push)

On the branch deploy (the URL is on the PR's GitHub deployment, under `models-resources/codap3/branch/`):

- [ ] The THIRD-PARTY-NOTICES link displays the file rather than downloading it. If it downloads, switch the
      file to `THIRD-PARTY-NOTICES.txt` (webpack config, constant, tests, docs) and recheck.
- [ ] The list loads and the notices link points into the branch folder.

**Step 4: Wrap up**

Use superpowers:finishing-a-development-branch, then follow CLAUDE.md's PR process (draft PR, `v3` label,
Jira link).
