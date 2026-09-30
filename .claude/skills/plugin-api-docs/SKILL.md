---
name: plugin-api-docs
description: Use when regenerating, checking, or auditing the CODAP v3 Plugin API reference in v3/doc/plugin-api/ — the per-resource pages, the quick-reference tables, the JSON inventory, or the request schema. Also use to check whether the Data Interactive code and its documentation have drifted, and before a v3 release.
---

# Plugin API reference tooling

Keeps `v3/doc/plugin-api/` honest about `v3/src/data-interactive/`. Three scripts under
`v3/scripts/plugin-api/`, each runnable on its own; npm scripts wrap them.

This solves the same problem as `generate-log-events-csv` does for log events, and is built the
same way: a deterministic compiler-API extractor, a merge step that rewrites only machine-owned
content, and a checker.

## The scripts

| npm script | What it does |
|---|---|
| `npm run plugin-api:extract` | Re-extracts the inventory to `doc/plugin-api/plugin-api.json` |
| `npm run plugin-api:generate` | Rewrites generated blocks in the docs, writes the request schema, reports drift |
| `npm run plugin-api:lint` | Checks the docs against the code and the conventions |
| `npm run plugin-api:check` | Both of the above in report-only mode — what CI runs |

Run them from `v3/`.

## When to use which

**Before a release, or after touching `src/data-interactive/`:**

```
npm run plugin-api:generate && npm run plugin-api:lint
```

Then read the drift report. `CHANGED` means a table was stale and has been rewritten — review
the diff. `NEW` means a resource exists in code that nothing documents and that is not in the
baseline; either document it or add it to the baseline deliberately.

**To see whether anything has drifted, without writing:** `npm run plugin-api:check`.

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
inside one is provisional: it stands until the generator learns that block, then is replaced
without warning. Never hand-edit a block the generator already writes — run
`npm run plugin-api:generate` and read the "Hand-maintained (left alone)" list to see which is
which. See `v3/doc/plugin-api/conventions.md` for the full rules.

## The undocumented baseline

`doc/plugin-api/undocumented-baseline.txt` lists resources with no page yet. The drift check
reports a resource only if it is undocumented *and* absent from the baseline, so the check is
meaningful during the migration instead of permanently red.

When a page lands, delete its line. The check reports stale entries, so the file cannot quietly
rot.

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
- `scope` derives from two signals: whether the parser exempts the resource from `#default`
  defaulting, and whether the handler actually reads a data context. The exemption list alone is
  misleading — `adornment` has a context resolved and ignores it.
- Error strings reach the docs with CODAP's `%@` i18n notation replaced by neutral `<value>`
  placeholders. A resource page may name them meaningfully in its own hand-written table.
