# adornment

> **Applies to:** CODAP v3 · **Verified:** 2026-09-25 against `main` @ `ae2105cf4`
> · Parts of this page are generated — see [conventions](../conventions.md).

Adornments are the measures and overlays a graph can display on top of its points — a mean line,
a box plot, a least-squares line, a movable value, and so on. This resource reads and controls
them. `adornmentList` enumerates the adornments a graph currently has.

Adornments belong to **graphs only**. Addressing this resource on any other component returns
`Unsupported component type <type>`.

**An adornment exists only once it has been shown.** A graph starts with no adornments in its
store; one is added the first time it is displayed, whether by the user or through `create`.
Hiding it — including via `delete` — leaves it in the store with `isVisible: false`. So a `get`
for an adornment the user has never turned on returns `Adornment not found.`, while a `get` for
one that was shown and then hidden succeeds and reports `isVisible: false`.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | adornment | adornmentList |
|---|---|---|
| `get` | ✓ | ✓ |
| `create` | ✓ (some types) | — |
| `update` | ✓ (some types) | — |
| `delete` | ✓ (all types) | — |
| `notify` | — | — |
| `register` | — | — |
| `unregister` | — | — |
<!-- END GENERATED: actions -->

**`create` and `update` are supported for only some adornment types**, which is the single most
common surprise with this resource. See [Adornment types](#adornment-types) for the per-type
table. `delete` works for every type: when a type has no delete handler CODAP falls back to
hiding the adornment, which is why it never removes it from the store.

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `component[<component>].adornment[<type-or-id>]` | get |
| `component[<component>].adornment` | create, update, delete |
| `component[<component>].adornmentList` | get |
<!-- END GENERATED: selectors -->

`<component>` identifies the graph by title, name, or numeric id. `<type-or-id>` is either the
adornment's `type` string or its `id`.

For `create`, `update` and `delete` the type goes in `values.type` rather than in the selector,
because those requests carry a values object anyway.

This resource is **not** scoped to a data context, so the default-data-context rule does not
apply. Naming a `dataContext` in the selector has no effect.

### Type names and aliases

Type strings contain spaces — `"Movable Line"`, `"Box Plot"`. Two kinds of alias are accepted
everywhere a type is:

- **Space-free forms**, registered automatically: `"MovableLine"` resolves to `"Movable Line"`.
- **`"Percent"`**, which resolves to `"Count"`. Percent is part of the Count adornment rather
  than a separate one, though the UI and `adornmentList` present them separately.

## Adornment types

Fifteen types register a handler. `create` and `update` need a type-specific handler; `delete`
falls back to hiding, so it works everywhere.

<!-- BEGIN GENERATED: values -->
| Type | get | create | update | delete |
|---|---|---|---|---|
| `Count` (alias `Percent`) | ✓ | ✓ | ✓ | ✓ |
| `Movable Value` | ✓ | ✓ | ✓ | ✓ |
| `Plotted Value` | ✓ | ✓ | ✓ | ✓ |
| `LSRL` | ✓ | ✓ | ✓ | hides |
| `Region of Interest` | ✓ | ✓ | ✓ | hides |
| `Mean` | ✓ | ✓ | ✓ | hides |
| `Median` | ✓ | ✓ | ✓ | hides |
| `Standard Deviation` | ✓ | ✓ | ✓ | hides |
| `Box Plot` | ✓ | — | — | hides |
| `Mean Absolute Deviation` | ✓ | — | — | hides |
| `Movable Line` | ✓ | — | — | hides |
| `Movable Point` | ✓ | — | — | hides |
| `Normal Curve` | ✓ | — | — | hides |
| `Plotted Function` | ✓ | — | — | hides |
| `Standard Error` | ✓ | — | — | hides |
<!-- END GENERATED: values -->

The seven read-only types **cannot be turned on through the API** — `create` and `update` both
return `The <type> adornment does not currently support <action> requests.` A plugin can read
them once the user has enabled them in the graph's inspector, and can hide them with `delete`,
but cannot display them in the first place. This is a gap rather than a deliberate limitation,
tracked as **CODAP-1551**; this table and paragraph change when it is closed.

## Values

### get

Returns the adornment's identity plus type-specific measure data:

| Property | Type | Notes |
|---|---|---|
| `id` | String | The adornment's id. |
| `type` | String | The canonical type string, not the alias you asked with. |
| `isVisible` | Boolean | `false` for an adornment that was shown and later hidden. |
| `data` | Array | Type-specific. One entry per graph cell — a graph split by categorical attributes has one per subplot, each carrying a `categories` object identifying it. |

What `data` contains depends on the type. A `Box Plot` entry carries `median`, `lowerQuartile`,
`upperQuartile`, `interquartileRange`, `lower` and `upper`; a `Mean` entry carries the mean
value. Read the type's handler under
`src/components/graph/adornments/` for the exact shape — these are not yet catalogued here.

### create, update, delete

All three take a `values` object containing at least `type`:

| Property | Type | Notes |
|---|---|---|
| `type` | String | **Required.** The adornment type or an alias. Omitting it returns `A values object is required for this request.` |

Individual types accept further properties — a `Movable Value` takes a value to place, a
`Plotted Value` takes an expression. Those are documented with the types themselves, which this
page does not yet cover.

## Examples

**List the adornments on a graph.**

```json
{
  "action": "get",
  "resource": "component[Height by Weight].adornmentList"
}
```

```json
{
  "success": true,
  "values": [
    { "id": "ADRN123", "type": "Count", "isVisible": true },
    { "id": "ADRN123", "type": "Percent", "isVisible": false },
    { "id": "ADRN456", "type": "Mean", "isVisible": true }
  ]
}
```

Note that `Count` and `Percent` are reported as separate entries sharing one `id`, each with its
own visibility, and that the list is **filtered by the graph's current plot type** — an adornment
in the store that the current plot cannot display is omitted.

**Read a specific adornment.**

```json
{
  "action": "get",
  "resource": "component[Height by Weight].adornment[Mean]"
}
```

**Show a mean line.**

```json
{
  "action": "create",
  "resource": "component[Height by Weight].adornment",
  "values": { "type": "Mean" }
}
```

**Hide it again.**

```json
{
  "action": "delete",
  "resource": "component[Height by Weight].adornment",
  "values": { "type": "Mean" }
}
```

The adornment remains in the graph's store with `isVisible: false`, so a subsequent `get`
succeeds rather than reporting it missing.

## Notifications

Toggling an adornment emits a component notification whose operation is specific to the
adornment — `togglePlottedMean`, `toggle connecting line`, `add movable value` and so on. These
match the V2 operation strings, including V2's inconsistent casing. The catalog of
CODAP-initiated notifications is not yet migrated; see the "CODAP-Initiated Actions" section of
the
[wiki page](https://github.com/concord-consortium/codap/wiki/CODAP-Data-Interactive-Plugin-API).

## Errors

<!-- BEGIN GENERATED: errors -->
| Error | Condition |
|---|---|
| `Unsupported component type %@` | The selector named a component that is not a graph. |
| `Adornment not found.` | `get` or `update` for a type the graph has never displayed, or an id that matches nothing. |
| `Adornment list not found.` | `adornmentList` on a component whose adornment list could not be resolved. |
| `Unsupported adornment type` | The adornment exists but has no registered handler. |
| `The %@1 adornment does not currently support %@2 requests.` | `create` or `update` for one of the read-only types above. |
| `Not a(n) %@1 adornment.` | Internal type mismatch between the resolved adornment and its handler. |
| `Adornment not supported by plot type.` | The adornment cannot be displayed by the graph's current plot type. |
| `A values object is required for this request.` | `create`, `update` or `delete` sent without `values`, or without `values.type`. |
<!-- END GENERATED: errors -->
