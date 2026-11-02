# CODAP-1595: Open-source libraries list — Design

**Status:** Approved
**Jira:** [CODAP-1595](https://concord-consortium.atlassian.net/browse/CODAP-1595)
**Branch:** `codap-1595-about-dialog`
**Builds on:** [About CODAP dialog design](2026-10-30-codap-1595-about-dialog-design.md)

## Goal

Fill in the About dialog's Open-source libraries view, which currently has only its intro and footer:

1. A searchable list of the third-party packages CODAP ships, each with its name, version, and license.
2. A `THIRD-PARTY-NOTICES.md` file with each package's full license text, linked from the view's footer.
3. A project count on the About view's "Open-source libraries & acknowledgements" button.

Both files are generated at build time from what webpack actually bundles, so they always match the code
being deployed, and they can't go stale because nothing generated is committed.

## Build-time generation

### Plugin

Add [`webpack-license-plugin`](https://www.npmjs.com/package/webpack-license-plugin) as a dev dependency and
register it in `v3/webpack.config.js` for both dev and production builds, so the list also works under
`npm start`. If it noticeably slows dev rebuilds, register it for production builds only.

It writes three files to `dist/`, next to `index.html`:

| File | Contents | Used by |
|---|---|---|
| `oss-licenses.json` | The plugin's default output: name, version, license, repository, and full license text for every bundled package | Source data; useful for audits |
| `oss-libraries.json` | `[{ name, version, license }]`, sorted alphabetically by name, no license text | The dialog |
| `THIRD-PARTY-NOTICES.md` | A heading, then one section per package: name, version, license, repository, full license text | The footer link |

The last two are generated with the plugin's `additionalFiles` option. The formatting functions live in a new
`v3/scripts/oss-licenses.js` so they can be unit tested outside the webpack config.

Packages with more than one bundled version appear once per version.

### Code that isn't bundled as a module

The plugin only sees modules in webpack's module graph. The Rollbar snippet is inlined into `index.html` by
file path (`ROLLBAR_SNIPPET_PATH` in `webpack.config.js`), so it's added with the plugin's `includePackages`
option. Fonts and icon fonts in `src/assets` are CODAP's own assets, not npm packages.

### Inconclusive license data

- When a package's `license` field isn't a valid SPDX expression, the plugin warns. Fix these with
  `licenseOverrides` (`"<name>@<version>": "<SPDX expression>"`), each verified by hand.
- Turn on `replenishDefaultLicenseTexts` so packages that don't ship a license file get the standard text
  from spdx.org. This needs network access at build time; if CI can't reach spdx.org, leave it off and list
  the packages without license text in the notices file instead.

### Validation spike

Before building the dialog changes, run a production build with the plugin to learn the real package count,
which packages need `licenseOverrides`, whether the spdx.org lookup works in CI, and the added build time.

## Deployment

No workflow or AWS changes are needed. Everything in `v3/dist/` is already uploaded by the `s3-deploy` job
in `.github/workflows/v3.yml`, to `models-resources/codap3/branch/<name>/` or `.../version/<tag>/`. The dev
server serves the files from memory.

### Asset URLs

The production, beta, staging, and ai4vs release workflows copy only `version/<tag>/index-top.html` to the
top level; that page loads its scripts from the version folder. A plain relative URL like
`THIRD-PARTY-NOTICES.md` would therefore resolve to the top level and 404.

A new helper builds URLs from webpack's runtime public path, which webpack 5 derives from the script's
location because `output.publicPath` isn't set:

```ts
// returns the URL of a file emitted next to index.html by the build
export function getBuildAssetUrl(filename: string) {
  return typeof __webpack_public_path__ === "string" ? `${__webpack_public_path__}${filename}` : filename
}
```

`__webpack_public_path__` needs a declaration in `src/global.d.ts`. In Jest it's undefined, so the helper
returns the bare file name.

On a promoted page this resolves to `.../version/<tag>/THIRD-PARTY-NOTICES.md`: the notices for the release
the user is actually running.

### Content type check

`.md` will most likely be served as `text/markdown`, which some browsers download instead of displaying.
Verify on a branch deploy. If it downloads, emit `THIRD-PARTY-NOTICES.txt` instead, which every browser
displays.

## Dialog changes

### Notices link

`kThirdPartyNoticesUrl` in `about-dialog-constants.ts` changes from the GitHub URL to
`getBuildAssetUrl("THIRD-PARTY-NOTICES.md")`.

### Loading the list

A `useOssLibraries()` hook fetches `getBuildAssetUrl("oss-libraries.json")` once per session, caching the
request at module level so reopening the dialog doesn't refetch. It returns
`{ status: "loading" | "loaded" | "error", libraries }`.

The fetch starts when the dialog opens (not when the libraries view opens), so the About view's button can
show the count.

### About view: acknowledgements button

"Open-source libraries & acknowledgements" on the left; "%{count} projects ›" on the right once loaded.
While loading or after an error, the count is omitted (the › stays).

### Open-source libraries view

In order:

1. Intro paragraph (existing).
2. Search field: Chakra `Input`, placeholder and accessible label "Search libraries…". Case-insensitive
   substring match on name or license.
3. List: a `<ul>` in a bordered box that scrolls within the dialog (~300px tall). Each `<li>` shows the name
   on the left and the version plus a license badge (Chakra `Badge`, no custom styling) on the right.
4. A visually hidden `aria-live="polite"` region announcing the result count (e.g. "12 libraries").
5. In place of the list, as applicable:
   - Loading: "Loading libraries…"
   - No search results: "No libraries match “%{query}”."
   - Load failed: "The library list couldn't be loaded."
6. Footer (existing). The notices link shows in every state.

Opening the libraries view still moves focus to the header Back button; users tab into the search field.

### Strings

New strings in `en-US.json5`:

- `V3.AboutDialog.projectCount`: "%{count} projects"
- `V3.AboutDialog.libraries.searchLabel`: "Search libraries…"
- `V3.AboutDialog.libraries.resultCount`: "%{count} libraries"
- `V3.AboutDialog.libraries.loading`: "Loading libraries…"
- `V3.AboutDialog.libraries.noMatches`: "No libraries match “%{query}”."
- `V3.AboutDialog.libraries.loadError`: "The library list couldn't be loaded."

## Testing

**Jest**

- `scripts/oss-licenses.test.js`: the dialog list is sorted alphabetically (including scoped packages) and
  omits license text; the notices Markdown includes every package's license text; missing text or
  repository is handled cleanly.
- `useOssLibraries` (mocked `fetch`): loading, loaded, and error states; a second use reuses the cached
  request.
- `getBuildAssetUrl`: with and without `__webpack_public_path__`.
- `about-dialog.test.tsx` (mocked `fetch`): project count on the button once loaded, omitted while loading or
  on error; list rows show name, version, and license; search by name and by license, case-insensitive;
  no-match message; live region count; loading and error messages; notices link uses the build-asset URL.

**Cypress**

Extend `cypress/e2e/about-dialog.spec.ts` against the dev server's real data: the button shows a count, the
list includes `react`, and typing "mobx" narrows the list to MobX packages.

**Manual, after pushing the branch**

- On the branch deploy, open the notices link and confirm the browser displays it (see
  [Content type check](#content-type-check)).
- Confirm the notices link and list fetch point into the branch folder.
- After the next release, check a promoted page (beta or staging) the same way.

## Docs to update

- [About CODAP dialog design](2026-10-30-codap-1595-about-dialog-design.md): the THIRD-PARTY-NOTICES link
  and the Out of scope section.
- `v3/doc/deploy.md`: note that deployed folders now include `oss-licenses.json`, `oss-libraries.json`, and
  `THIRD-PARTY-NOTICES.md`.

## Out of scope

- Failing the build on disallowed licenses (e.g. GPL), which the plugin supports via
  `unacceptableLicenseTest`.
- Linking library rows to their repositories.
- Plugins loaded from codap-resources: separate projects, not part of CODAP's bundle.
