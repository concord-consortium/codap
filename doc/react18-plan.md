# Publishing a React 18 `@concord-consortium/codap-formulas` Package

A standalone plan for replacing `@concord-consortium/codap-formulas-react17`
with a React-18-compatible package, plus suggestions for making the new
package easier to trace back to its source.

## Background

`@concord-consortium/codap-formulas-react17` was extracted from CODAPv3 during
a mono-repo refactor in the `concord-consortium/codap` repo. The relevant
history:

- PR [#1967 "Migrate to yarn PnP"](https://github.com/concord-consortium/codap/pull/1967) — merged into `monorepo`, 2025-07-09.
- PR [#1976 "CODAP-736-start-monorepo"](https://github.com/concord-consortium/codap/pull/1976) — merged into `monorepo`, 2025-07-10.
- PR [#1989 "CODAP-740-formula-library"](https://github.com/concord-consortium/codap/pull/1989) — created `formulas-react17/`, merged into `monorepo`, 2025-07-23.

All three PRs targeted the long-lived `monorepo` branch. **No PR was ever
opened to merge `monorepo` into `main`.** The `formulas-react17` directory
exists only on `monorepo` (and its descendants); it is not present on `main`.
At the time these notes were written, `monorepo` was ~36 commits behind `main`.

`@concord-consortium/codap-formulas-react17@1.1.2` on npm was published from
the `monorepo` branch (the npm `gitHead` field points at commit
`6907f3b57e0173ce6f695c18b6c9fab4d3ad9457`, which is on
`CODAP-740-formula-library` → `monorepo`).

The `-react17` suffix in the package name was chosen on purpose so that a
future React 18 sibling could be published alongside. That sibling does not
exist yet.

## Plan for the React 18 package

We will **not** try to land the mono-repo refactor on `main` as part of the
CLUE React 18 work. Instead:

1. Open a PR against the `monorepo` branch of `concord-consortium/codap` that:
   - declares `peerDependencies` of `react: "^18.0.0 || ^19.0.0"` and
     `react-dom: "^18.0.0 || ^19.0.0"` so the new package supports both
     React majors with one published version. (We're explicitly **not**
     keeping React 17 support — dropping it sidesteps the React 17 → 18
     `@types/react` `children`-prop change and the source-wide audit it
     would otherwise force.)
   - sets the package's own dev install of `react`/`react-dom` and
     `@types/react`/`@types/react-dom` to a single concrete version
     (React 18 is the conservative choice — code that compiles against
     React 18 types is forward-compatible to React 19 in most cases).
   - bumps `@chakra-ui/react` to v2 (which requires React 18),
   - renames the package — drop the `-react17` suffix; ideally the new
     name doesn't encode any React version. (See traceability section
     below.)
   - addresses any breakage that falls out of the bumps.
2. Add a CI matrix that installs each supported React version on top of
   the base install and re-runs typecheck and tests against it. Without
   this the multi-version peerDep claim is unverified. Sketch:

   ```yaml
   strategy:
     matrix:
       react: ["18.2.0", "19.0.0"]
   steps:
     - run: npm ci   # or yarn install
     - run: npm install --no-save \
              react@${{ matrix.react }} \
              react-dom@${{ matrix.react }} \
              @types/react@${{ matrix.react }} \
              @types/react-dom@${{ matrix.react }}
     - run: npm run check:types
     - run: npm test
   ```
3. Publish that new package to npm.
4. Update CLUE to depend on the new package and remove
   `@concord-consortium/codap-formulas-react17`.

This keeps the mono-repo branch as the source of truth for the published
package without forcing the bigger mono-repo merge to land on `main` first.

## Traceability improvements at publish time

Tracking down how the existing `-react17` package was built took several
steps because nothing inside the published artifact pointed at the branch it
came from. The following changes — applied when publishing the new
package — would make the path from npm back to source obvious for the next
person.

### 1. Use npm provenance

Publish via `npm publish --provenance` (npm 9.5+) from a public-repo GitHub
Actions workflow with `id-token: write` permission. npm attaches a Sigstore
attestation that the package page surfaces as **"Built and signed on GitHub
Actions"** with a direct link to the workflow run that built the artifact.
This is the single biggest improvement: anyone landing on the npm page can
click straight through to the workflow run, which links back to the commit,
branch, and PR.

Reference: <https://docs.npmjs.com/generating-provenance-statements>.

### 2. Push a git tag (and ideally a GitHub Release) per published version

A tag like `codap-formulas-v1.0.0` makes the otherwise-opaque `gitHead`
field human-navigable from GitHub. Even better: cut a GitHub Release at that
tag with a one-line note ("built from `monorepo` branch") and the changelog.
This also gives the publish workflow a natural trigger.

### 3. Include a README in the published tarball

The current `-react17` tarball ships with no README (`readmeFilename: ""` on
npm). Add a short `README.md` to the package directory and include it in the
`files` list in `package.json`. The README only needs a few sentences:

> This package is built from the `monorepo` branch of
> `concord-consortium/codap`, in the `<dir>/` directory.
> See [link] for build/contribution notes.

The npm package page will render this README, so it becomes the first thing
anyone looking at the package sees.

### 4. Set `homepage` to a branch-specific URL

Set `homepage` in `package.json` to a URL that lands on the actual source,
e.g.:

```
"homepage": "https://github.com/concord-consortium/codap/tree/monorepo/<dir>"
```

The npm page exposes the homepage as a top-level link. Pointing it at the
right branch avoids the "this directory doesn't exist" surprise that
`main` produces today.

### 5. Drop the `-react17` suffix in the new package name

Without a sibling actually being published, the suffix only causes
confusion (it implies a counterpart exists). Name the new package after
what it is — for example `@concord-consortium/codap-formulas` — and let the
required React version be expressed in `peerDependencies`. If both a React
17 build and a React 18 build need to coexist, document the suffix scheme
clearly in both READMEs.
