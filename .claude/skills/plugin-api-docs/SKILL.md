---
name: plugin-api-docs
description: Use when regenerating, checking, or auditing the CODAP v3 Plugin API reference in v3/doc/plugin-api/ — the per-resource pages, the quick-reference tables, the JSON inventory, the request schema, or the plugin API Tester's request templates (reference-templates.json in codap-data-interactives). Also use to check whether the Data Interactive code and its documentation have drifted, and before a v3 release.
---

# Plugin API reference tooling

Keeps `v3/doc/plugin-api/` honest about `v3/src/data-interactive/`, and the plugin API Tester's
templates in step with the docs. Four scripts under `v3/scripts/plugin-api/` (extract, generate,
lint, and the tester templates), each runnable on its own; npm scripts wrap them.

This solves the same problem as `generate-log-events-csv` does for log events, and is built the
same way: a deterministic compiler-API extractor, a merge step that rewrites only machine-owned
content, and a checker.

## The scripts

| npm script | What it does |
|---|---|
| `npm run plugin-api:extract` | Prints the inventory as JSON to stdout (the generator is what writes the file) |
| `npm run plugin-api:generate` | Rewrites generated blocks in the docs, writes the request schema, reports drift |
| `npm run plugin-api:lint` | Checks the docs against the code and the conventions |
| `npm run plugin-api:check` | Both of the above in report-only mode — what CI runs |
| `npm run plugin-api:tester` | Writes the plugin API Tester's `reference-templates.json` from the request examples on the resource pages |
| `npm run plugin-api:tester:check` | Reports whether the tester's copy is missing or stale, without writing |

`markers.mjs`, `inventory.mjs`, `coverage.mjs`, `markdown.mjs` and `tester-templates.mjs` are
shared helpers, not entry points: the first defines a well-formed generated-block marker, the
second is the one way the scripts run the extractor, the third says which page documents which
resource, the fourth holds the fenced-code, json-block and heading-anchor rules, and the fifth
builds the tester's templates and finds the examples that would be left out, for both the tester
script and the lint.
The generator consults `markers.mjs` *before* rewriting a page and skips any page whose markers
it cannot prove safe; that file explains what a rewrite would otherwise destroy.

Run them from `v3/`.

## When to use which

**Before a release, or after touching `src/data-interactive/`:**

```
npm run plugin-api:generate && npm run plugin-api:lint
npm run plugin-api:tester:check
```

Then read the drift report. `CHANGED` means a table was stale and has been rewritten — review
the diff. `NEW` means a resource exists in code that nothing documents and that is not in the
baseline; either document it or add it to the baseline deliberately.

**To see whether anything has drifted, without writing:** `npm run plugin-api:check`.

**After a codap PR that changes the templates merges:** regenerate the tester's templates. They
change with a resource page's request examples, the prose that introduces each one (it names the
template), its headings (each template's `source` link) and the inventory's actions. Regenerate
after the codap PR merges, since each `source` link points at `blob/main`.

1. Pull the `codap-data-interactives` clone beside `codap` (the tester scripts assume it is
   there; `npm run plugin-api:tester -- --out <file>` writes elsewhere, for example from a
   worktree). In a stale clone, `plugin-api:tester:check` reports the file missing or out of date
   even when the live copy is current.
2. `npm run plugin-api:tester`. It fails (exit 2), and says why, if an example names a resource or
   action the inventory doesn't list, or a documented action has no example. `plugin-api:lint`
   reports the same problems, so CI catches them first.
3. Commit `DataInteractiveAPITester/resources/reference-templates.json` through a PR to that
   repo's `master` (its development branch), then cherry-pick the commit to `gh-pages`, which
   serves the live tester, and push. That repo's CLAUDE.md explains why `gh-pages` is updated by
   hand, not regenerated from `master`.

CI's advisory `plugin-api-docs` job also fetches the live copy from `gh-pages` and warns when it
differs from the branch's reference, which it does from the moment a PR changes the templates until
they are regenerated after it merges. It never fails the build.

## What is generated and what is not

Generated blocks are delimited in the markdown:

```
<!-- BEGIN GENERATED: actions -->
...
<!-- END GENERATED: actions -->
```

The generator writes `actions`, `scope`, `adornment-types`, the three `quick-reference.md`
tables, and a `values` block **only** when it declares its source interface:

```
<!-- BEGIN GENERATED: values source=DIAttribute -->
```

Everything else it leaves alone and reports. That is deliberate: resources do not map to value
interfaces by name, so a block the tool cannot fill completely is better hand-written than
half-generated. The lint checks those instead.

A marker declares a block machine-owned even before the tool can fill it. Content hand-written
inside one is provisional: it stands until the generator learns that block, then is replaced —
reported as CHANGED, and as a `--check` failure, not silently. Never hand-edit a block the generator already writes — run
`npm run plugin-api:generate` and read the "Hand-maintained (left alone)" list to see which is
which. See `v3/doc/plugin-api/conventions.md` for the full rules.

## The undocumented baseline

`doc/plugin-api/undocumented-baseline.txt` lists resources with no page yet. The drift check
reports a resource only if it is undocumented *and* absent from the baseline, so the check is
meaningful while resources still lack pages instead of permanently red.

When a page lands, delete its line. The check reports stale entries, so the file cannot quietly
rot. Also give the resource a row in the index's resource table and a line in `llms.txt`; the
lint fails until `llms.txt` lists the page.

## What the extractor deliberately does not know

It reports facts, not judgment. It cannot produce, and will never overwrite:

- why a resource exists, or when a plugin would reach for it
- the condition that produces an error — only the string is derivable
- worked examples
- per-adornment measure-data shapes, assembled at runtime by each handler's `getAdditionalData`

If one of those is wrong in the docs, a human wrote it and a human fixes it.

## Gotchas

- The extractor resolves **one** level of factory indirection — several adornments get their
  handler from `univariateMeasureAdornmentBaseHandler`. Anything deeper is reported as unresolved
  rather than guessed; if you see `built by …()` in the inventory, the actions are unknown, not
  absent.
- Value interfaces are resolved through `extends`, including `extends Partial<X>` (which makes
  the inherited members optional) and the alias forms `type X = Y` / `type X = Partial<Y>`.
  Members carry `inherited` naming the interface they came from. This matters more than it
  sounds: every component type extends `V2Component`, and `DIAttribute` declares 2 members and
  inherits 22. A base the walker cannot find is listed in `unresolvedBases` rather than dropped.
  Unions and MST `Partial<SnapshotIn<typeof Model>>` aliases denote no single member list and
  are skipped, not approximated.
- "Documented" has one definition, in `coverage.mjs`, used by both the generator and the lint: a
  page's generated `actions` header names every resource that page covers, falling back to the
  filename for a single-resource page. A mention in prose never counts.
- `scope` derives from two signals: whether the parser exempts the resource from `#default`
  defaulting, and whether the handler actually reads a data context. The exemption list alone is
  misleading — `adornment` has a context resolved and ignores it.
- Error strings reach the docs with CODAP's `%@` i18n notation replaced by neutral `<value>`
  placeholders. A resource page may name them meaningfully in its own hand-written table.
