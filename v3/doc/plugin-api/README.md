# CODAP Data Interactive Plugin API

> **Applies to:** CODAP v3 · **Verified:** 2026-09-25 against `main` @ `ae2105cf4`
> · Parts of this reference are generated — see [conventions](conventions.md).

Reference for developers writing CODAP plugins. A plugin runs in an iframe inside CODAP and talks
to it by sending request messages and receiving responses and notifications.

**This reference is being migrated.** It is moving out of the
[wiki page](https://github.com/concord-consortium/codap/wiki/CODAP-Data-Interactive-Plugin-API)
and into this folder, one resource at a time, so that each resource is a complete self-contained
page rather than a section of a 4,000-line document. Until that finishes:

- The [resource table](#resources) below says where each resource is documented.
- Pages here are current for v3. The wiki remains accurate for everything not yet moved,
  including the corrections made in CODAP-1536.
- When migration completes, the wiki page will be frozen as the **CODAP v2** reference.

---

## Terminology

The wiki page used these interchangeably. This reference does not — use the canonical term.

| Canonical | Also seen as | Notes |
|---|---|---|
| **plugin** | data interactive, DI, interactive | The iframe'd application talking to CODAP. "Data interactive" is the older term and survives in API names like `interactiveFrame`. |
| **data context** | data set, dataContext | The container for a set of related cases. `dataContext` is the API spelling; "data set" is the UI term for the same thing. |
| **collection** | — | A level in a data context's hierarchy. A data context has one or more. |
| **attribute** | column, field | A typed property of a case. |
| **case** | row | A grouping of items at one collection level. Cases live on collections, not on the data context. |
| **item** | — | A flat row of values, and the source of truth — cases are constructed by grouping items. A case in the child-most collection corresponds one-to-one with an item, **but the two still have different ids**, so `caseByID` and `itemByID` are not interchangeable. See [`../hierarchical-data.md`](../hierarchical-data.md). |
| **component** | tile | A thing in the CODAP workspace — a graph, table, map, slider, or a plugin itself. |
| **resource** | — | The thing a request addresses, named by the `resource` field. |
| **action** | verb | One of `get`, `create`, `update`, `delete`, `notify`, `register`, `unregister`. |

---

## Request shape

Every request a plugin sends has the same envelope:

```json
{
  "action": "get",
  "resource": "dataContext[Mammals].collection[Cases].attributeList"
}
```

`values` carries the payload for `create`, `update` and `notify`:

```json
{
  "action": "create",
  "resource": "dataContext[Mammals].item",
  "values": { "Animal": "Ocelot", "Height": 0.5 }
}
```

**IDs are numbers.** Everywhere this API accepts or returns an `id`, the value is a number. CODAP
v3 uses prefixed strings internally (`ATTR...`, `DATA...`), but those never cross the API
boundary. A request built with a v3 internal string id will not resolve.

---

## The default data context

Most resource selectors may omit the data context, in which case CODAP supplies `#default`, which
resolves to **the first data context in the document**:

```json
{ "action": "get", "resource": "collection[Cases].attributeList" }
```

This is equivalent to naming `dataContext[#default]`. Two things to know:

- Defaulting does **not** apply to these, which are not scoped to a data context:
  `component`, `componentList`, `dataContextList`, `dataDisplay`, `document`, `formulaEngine`,
  `global`, `globalList`, `interactiveApi`, `interactiveFrame`, `logMessage`,
  `logMessageMonitor`, `undoableActionPerformed`, `undoChangeNotice`
  (`resource-parser.ts:98-101`). Note `undoableActionPerformed` is an *operation* of the
  `undoChangeNotice` resource rather than a resource of its own; it appears in the parser's
  exemption list all the same.
- It does not apply when you are **creating** a data context (`create dataContext` or
  `create dataContextFromURL`) — there is nothing to default to yet.

In a document with more than one data context, relying on the default is fragile. Name the
context explicitly.

---

## Resources

All 38 resources CODAP v3 registers, alphabetically. Pages marked *this repo* are current
for v3; the rest are still on the
[wiki page](https://github.com/concord-consortium/codap/wiki/CODAP-Data-Interactive-Plugin-API),
which remains accurate for them.

| Resource | Documented in |
|---|---|
| `adornment` | wiki |
| `adornmentList` | wiki |
| `allCases` | wiki |
| `attribute` | wiki |
| `attributeList` | wiki |
| `attributeLocation` | wiki |
| `case` | wiki |
| `caseByID` | wiki |
| `caseByIndex` | wiki |
| `caseCount` | wiki |
| `caseFormulaSearch` | wiki |
| `caseSearch` | wiki |
| `collection` | wiki |
| `collectionList` | wiki |
| `component` | wiki |
| `componentList` | wiki |
| `configuration` | wiki |
| `configurationList` | wiki |
| `dataContext` | wiki |
| `dataContextFromURL` | wiki |
| `dataContextList` | wiki |
| **[`dataDisplay`](resources/data-display.md)** | **this repo** |
| `document` | wiki |
| `formulaEngine` | wiki |
| `global` | wiki |
| `globalList` | wiki |
| `interactiveApi` | wiki |
| `interactiveFrame` | wiki |
| `item` | wiki |
| `itemByCaseID` | wiki |
| `itemByID` | wiki |
| `itemCount` | wiki |
| `itemSearch` | wiki |
| `logMessage` | wiki |
| `logMessageMonitor` | wiki |
| `selectionList` | wiki |
| `tourElements` | wiki |
| `undoChangeNotice` | wiki |

---

## Guides

Narrative chapters covering behavior that spans resources — embedded-server mode, request
coalescing, undo/redo, locale — live in **[`guides/`](guides/README.md)**, which also lists the
internal design documents to consult until those chapters are written.

The catalog of notifications CODAP sends to plugins will live in `notifications.md`, arriving
with Phase 4 (CODAP-1539). Until then it is the "CODAP-Initiated Actions" half of the
[wiki page](https://github.com/concord-consortium/codap/wiki/CODAP-Data-Interactive-Plugin-API).

---

## For maintainers

[Conventions](conventions.md) — page layout, generated blocks, and the rules that keep pages
self-contained.

The plan driving this work is [`../plugin-api-doc-update-plan.md`](../plugin-api-doc-update-plan.md).
