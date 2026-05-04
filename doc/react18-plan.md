# Publishing a React 18+ `@concord-consortium/codap-formulas` Package

A plan for publishing the existing `formulas/` workspace as a
React-18-compatible npm package, alongside the already-published
`@concord-consortium/codap-formulas-react17`.

## Background

The mono-repo contains two formulas workspaces:

- [formulas/](../formulas/) — the **source of truth**. `package.json` name
  `@concord-consortium/codap-formulas`, version `1.1.0`. Has `src/`, full
  dev tooling, and direct deps on React 18 (`react: "^18.3.1"`,
  `react-dom: "^18.3.1"`) and Chakra v2 (`@chakra-ui/react: "~2.8.2"`).
  Consumed by [v3/](../v3/) as `"@concord-consortium/codap-formulas":
  "workspace:^"`. **Never published to npm** (`npm view` returns 404).
- [formulas-react17/](../formulas-react17/) — a thin republishing wrapper
  for React 17 consumers (CLUE today). No `src/` of its own; its
  [tsconfig.json](../formulas-react17/tsconfig.json) sets
  `rootDir: "../formulas/src"` and the build copies SCSS/JSON5 from
  `../formulas/src`. Has its own dependencies pinned to React 17,
  Chakra v1, framer-motion v6. Published as
  `@concord-consortium/codap-formulas-react17`, latest `1.1.2`
  (2025-07-11).

The relevant PR history (all merged into the long-lived `monorepo`
branch, never to `main`):

- [#1967 "Migrate to yarn PnP"](https://github.com/concord-consortium/codap/pull/1967) — 2025-07-09.
- [#1976 "CODAP-736-start-monorepo"](https://github.com/concord-consortium/codap/pull/1976) — 2025-07-10.
- [#1989 "CODAP-740-formula-library"](https://github.com/concord-consortium/codap/pull/1989) — created both `formulas/` and `formulas-react17/`, 2025-07-23.

`formulas-react17@1.1.2` was published from commit
`6907f3b57e0173ce6f695c18b6c9fab4d3ad9457` (on
`CODAP-740-formula-library` → `monorepo`).

We will **not** try to land the mono-repo refactor on `main` as part of
this work. The `monorepo` branch remains the source of truth for both
published packages.

## Compatibility check

What the existing `formulas/` package gets us for free:

- React 18 dev install, `@types/react@^18.3.18`, `@types/react-dom@^18.3.5`.
- Chakra v2 (`~2.8.2`).
- Mathjs, mobx, mobx-state-tree, lezer, framer-motion v12,
  @uiw/react-codemirror v4 — all current.

What it does **not** yet have:

- `react`/`react-dom` are in `dependencies` (lines 174-175). They must move
  to `peerDependencies` so consumers' React copy is used.
- No README, no provenance, no branch-specific homepage.
- No CI verification that the package builds/tests against multiple
  React versions.

## Phase 1 — first React 18 publish (this PR)

Goal: publish `@concord-consortium/codap-formulas` to npm with a React 18
peer dependency. No Chakra version change. No React 19 claims.

### Package changes in [formulas/package.json](../formulas/package.json)

1. Move `react` and `react-dom` from `dependencies` to `peerDependencies`
   at `"^18.0.0"`. Keep them in `devDependencies` at a concrete version
   (`^18.3.1`) so the package's own build, lint, and tests still resolve
   them. *(Do not yet expand the peer range to include `^19.0.0` — that's
   Phase 2, after the Chakra v3 migration.)*
2. Add `"files": ["dist"]` to match the wrapper package and avoid
   accidentally publishing source / `tsconfig.tsbuildinfo` /
   `.cache/eslint/default`. (See [doc/monorepo.md](monorepo.md), TODO list.)
3. Add `"repository.directory": "formulas"` so npm links the package page
   to the right subdirectory.
4. Update `"homepage"` to a branch-specific URL pointing at the actual
   source dir:
   `https://github.com/concord-consortium/codap/tree/monorepo/formulas`.
   (Pointing at `main` produces a "this directory doesn't exist"
   surprise.)
5. Publish as **`1.1.0`** — matches the in-tree value, and accurately
   represents the source tree. History: `formulas` and
   `formulas-react17` were last bumped together at `1.1.0` in commit
   `fbca9cb` (2025-07-09, "add support for registering additional
   functions"). The wrapper went on to `1.1.1` and `1.1.2` for
   wrapper-only republishes (no source change), which is why
   `formulas` is still at `1.1.0`. v3 references the package as
   `workspace:^` and jest's `moduleNameMapper` reads
   `../formulas/src` directly, so the literal version isn't
   load-bearing — but `1.1.0` is the most truthful number to ship.

### Add [formulas/README.md](../formulas/README.md)

Short README, included via the new `files` list. Suggested content:

> # `@concord-consortium/codap-formulas`
>
> Library for handling CODAP formulas. Built from the [`monorepo`
> branch](https://github.com/concord-consortium/codap/tree/monorepo/formulas)
> of `concord-consortium/codap`, in the `formulas/` directory.
>
> Peer dependencies: React 18.
>
> For React 17, see
> [`@concord-consortium/codap-formulas-react17`](https://www.npmjs.com/package/@concord-consortium/codap-formulas-react17).

This README will render on the npm package page — the first thing anyone
landing there sees.

### Publish workflow with provenance

Publish via `npm publish --provenance` (npm 9.5+) from a public-repo
GitHub Actions workflow with `id-token: write`. npm attaches a Sigstore
attestation that the package page surfaces as **"Built and signed on
GitHub Actions"** with a direct link to the workflow run, which links
back to the commit, branch, and PR. This is the single biggest
traceability improvement.

Reference: <https://docs.npmjs.com/generating-provenance-statements>.

There is no existing publish workflow to extend — `formulas-react17` is
currently published manually per its
[README](../formulas-react17/README.md). This Phase 1 workflow is
brand-new infrastructure; once it works for `formulas`, the manual
process for `formulas-react17` could be migrated to it later.

### Push a git tag (and ideally a GitHub Release) per published version

Tag like `codap-formulas-v1.1.0`. A GitHub Release at that tag with a
one-line note ("built from `monorepo` branch") and the changelog gives
the publish workflow a natural trigger and makes the otherwise-opaque
`gitHead` field human-navigable.

### Verification before publishing

After every package.json change in Phase 1, confirm nothing in the
mono-repo regressed. The peerDeps flip in particular changes how yarn
resolves `react`/`react-dom` for the workspace and could surface
duplicate-React or unresolved-import issues.

Run, from the repo root:

```sh
yarn install                                      # re-resolve workspaces
yarn workspace @concord-consortium/codap-formulas build
yarn workspace @concord-consortium/codap-formulas test
yarn workspace @concord-consortium/codap-formulas-react17 build
                                                  # shares source — verify still builds
cd v3
yarn build:dependencies                           # builds utilities + formulas
yarn lint
yarn test
yarn build:webpack                                # production bundle; catches any
                                                  # bundler-level React resolution issues
```

The `formulas-react17` build runs against the same `../formulas/src` —
no source/package change there is expected, but it's the cheapest way
to confirm the wrapper still produces a valid bundle.

Smoke-test in a browser is also worth doing:

```sh
cd v3 && yarn start
```

…and verify that components touching the formula system (formula
editor, plotted-value/plotted-function adornments) still render and
behave correctly. Type checking and tests verify code correctness, not
feature correctness.

### Out of scope for Phase 1

- **No CI matrix** for React 18/19 yet — there's only one supported React
  version (18) until Phase 2.
- **No changes to `formulas-react17/`.** It keeps building from
  `../formulas/src`.
- **No Chakra version change.**
- **Updating CLUE to consume the new package** — that's a PR in CLUE's
  repo, gated on this publish landing. Tracked separately.

## Phase 2 — React 19 support (follow-on PR)

Goal: expand the peer range to `"^18.0.0 || ^19.0.0"`.

The blocker is **Chakra UI**. `@chakra-ui/react@~2.8.2` does not support
React 19 — Chakra v3 does, and v3 is a substantial breaking-change
release (different component APIs, new theming model). This is real
engineering work, not a version bump.

Open questions to resolve in Phase 2:

1. **Chakra v3 migration** — touches every component in
   [formulas/src/components/](../formulas/src/components/) that uses
   Chakra. Chakra v3 supports React 18, so a single source can serve
   both peer ranges.
2. **Other dep audit for React 19**:
   - `framer-motion@^12.18.1` — supports React 19 (verify).
   - `@uiw/react-codemirror@^4.23.10` — supports React 19 (verify).
   - `@chakra-ui/icons` — replaced/restructured in Chakra v3.
3. **`formulas-react17/` impact.** That wrapper depends on Chakra v1.8.9
   while building from a source tree that will then use Chakra v3 APIs.
   The dual-build trick that works today (Chakra v1 wrapper + Chakra v2
   primary, both from one source) will probably break. Options:
   - Freeze `formulas-react17` at the pre-Phase-2 source tree (publish
     no further versions; CLUE migrates to React 18).
   - Add a separate `formulas-react17/src/` with React-17-compatible
     Chakra v1 imports (gives up the single-source benefit).
   - Drop `formulas-react17` entirely.
   Decide before merging Phase 2.
4. **Version bump.** Chakra v3 is a breaking dependency change for
   consumers — publish as `2.0.0`.
5. **CI matrix.** Now that two React versions are claimed, add a matrix
   that installs each on top of the base install and re-runs typecheck
   and tests:

   ```yaml
   strategy:
     matrix:
       react: ["18.2.0", "19.0.0"]
   steps:
     - run: yarn install
     - run: yarn workspace @concord-consortium/codap-formulas add --no-save \
              react@${{ matrix.react }} \
              react-dom@${{ matrix.react }} \
              @types/react@${{ matrix.react }} \
              @types/react-dom@${{ matrix.react }}
     - run: yarn workspace @concord-consortium/codap-formulas test
     - run: yarn workspace @concord-consortium/codap-formulas build:tsc
   ```

   (Without this, the multi-version peer claim is unverified.)

## Order of operations

1. Phase 1 PR against `monorepo`: peerDep flip, README, homepage,
   `files`, repo directory, publish workflow with provenance.
2. Tag + publish `@concord-consortium/codap-formulas@1.1.0`.
3. Update CLUE to consume the new package on a React-18 branch.
4. Phase 2 PR: Chakra v3 migration, peer range expansion, dep audit,
   CI matrix, decision on `formulas-react17` future, publish `2.0.0`.
