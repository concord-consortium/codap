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
| `create` | ✓ | — |
| `update` | ✓ | — |
| `delete` | ✓ | — |
| `notify` | — | — |
| `register` | — | — |
| `unregister` | — | — |
<!-- END GENERATED: actions -->

**`create` and `update` work for only some adornment types** — a common surprise with this
resource, since the table above says only that the resource accepts those actions. See
[Adornment types](#adornment-types) for what each type supports. `delete` works for every type:
when a type has no delete handler CODAP falls back to hiding the adornment, which is why it
never removes it from the store.

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

<!-- BEGIN GENERATED: scope -->
This resource does not use a data context. CODAP still resolves one — defaulting to
`#default` when the selector omits it — but this resource ignores it, so naming a
`dataContext` has no effect.
<!-- END GENERATED: scope -->

### Type names and aliases

Type strings contain spaces — `"Movable Line"`, `"Box Plot"`. Two kinds of alias are accepted
everywhere a type is:

- **Space-free forms**, registered automatically: `"MovableLine"` resolves to `"Movable Line"`.
- **`"Percent"`**, which resolves to `"Count"`. Percent is part of the Count adornment rather
  than a separate one, though the UI and `adornmentList` present them separately.

## Adornment types

Fifteen types register a handler. `create` and `update` need a type-specific handler; `delete`
falls back to hiding, so it works everywhere.

<!-- BEGIN GENERATED: adornment-types -->
| Type | get | create | update | delete |
|---|---|---|---|---|
| `Box Plot` (alias `BoxPlot`) | ✓ | — | — | hides |
| `Count` (alias `Percent`) | ✓ | ✓ | ✓ | ✓ |
| `LSRL` | ✓ | ✓ | ✓ | hides |
| `Mean` | ✓ | ✓ | ✓ | hides |
| `Mean Absolute Deviation` (alias `MeanAbsoluteDeviation`) | ✓ | — | — | hides |
| `Median` | ✓ | ✓ | ✓ | hides |
| `Movable Line` (alias `MovableLine`) | ✓ | — | — | hides |
| `Movable Point` (alias `MovablePoint`) | ✓ | — | — | hides |
| `Movable Value` (alias `MovableValue`) | ✓ | ✓ | ✓ | ✓ |
| `Normal Curve` (alias `NormalCurve`) | ✓ | — | — | hides |
| `Plotted Function` (alias `PlottedFunction`) | ✓ | — | — | hides |
| `Plotted Value` (alias `PlottedValue`) | ✓ | ✓ | ✓ | ✓ |
| `Region of Interest` (alias `RegionofInterest`) | ✓ | ✓ | ✓ | hides |
| `Standard Deviation` (alias `StandardDeviation`) | ✓ | ✓ | ✓ | hides |
| `Standard Error` (alias `StandardError`) | ✓ | — | — | hides |
<!-- END GENERATED: adornment-types -->

The seven read-only types **cannot be turned on through the API** — `create` and `update` both
return `The <type> adornment does not currently support <action> requests.` A plugin can read
them once the user has enabled them in the graph's inspector, and can hide them with `delete`,
but cannot display them in the first place. This is a known gap rather than a deliberate
limitation; the table above changes when it is closed.

"hides" in the table means `delete` succeeds by hiding rather than removing. It does **not** mean
`delete` always succeeds: deleting a type the graph has never shown returns `Adornment not
found.`, because there is nothing in the store to hide.

## Values

### get

Returns the adornment's identity plus type-specific measure data:

<!-- BEGIN GENERATED: values -->
| Property | Type |
|---|---|
| `id` | String |
| `type` | String |
| `isVisible` | Boolean |
| `data` | Array |
<!-- END GENERATED: values -->

`id` is the adornment's identifier — note that this is a **string**, one of the exceptions to the
usual numeric ids described in [the index](../README.md#request-shape). `type` is the canonical
type string, not whichever alias you asked with. `isVisible` is `false` for an adornment that was
shown and later hidden.

`data` holds one entry per graph cell: a graph split by categorical attributes has one entry per
subplot, each carrying a `categories` object identifying which. What each entry contains depends
on the type — **do not assume the key matches the adornment name.** Three worth knowing:

`Mean` and `Median` key the entry by the measure's own name:

```json
{ "data": [{ "mean": 12.5 }] }
```

`Standard Deviation` does **not** use a `standardDeviation` key. It reports the mean plus the
±1 SD range:

```json
{ "data": [{ "mean": 10, "min": 0, "max": 20 }] }
```

`Box Plot` carries the five-number summary — `median`, `lowerQuartile`, `upperQuartile`,
`interquartileRange`, `lower` and `upper` — and the result also carries top-level `showICI` and
`showOutliers` alongside `data`.

For other types, read the handler under `src/components/graph/adornments/` — the full per-type
catalog is not yet here.

### create, update, delete

All three take a `values` object containing at least `type`:

<!-- BEGIN GENERATED: values-write -->
| Property | Type | Required |
|---|---|---|
| `type` | String | yes |
<!-- END GENERATED: values-write -->

`type` is the adornment type or an alias. Omitting it — or sending no `values` at all — returns
`A values object is required for this request.`

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
own visibility.

The list is **filtered by the graph's current plot type** — an adornment in the store that the
current plot cannot display is omitted. `Count` and `Percent` are the exception: they bypass that
check and are always listed when a Count adornment exists, whether or not the current plot type
can display them.

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
| Error |
|---|
| `Unsupported component type <type>` |
| `Adornment not found.` |
| `Adornment list not found.` |
| `Unsupported adornment type` |
| `The <type> adornment does not currently support <action> requests.` |
| `Not a(n) <type> adornment.` |
| `Adornment not supported by plot type.` |
| `The current plot type does not support Percent.` |
| `A values object is required for this request.` |
<!-- END GENERATED: errors -->

| Error | Condition |
|---|---|
| `Unsupported component type <type>` | The selector named a component that is not a graph. |
| `Adornment not found.` | `get`, `update` or `delete` for a type the graph has never displayed, or an id that matches nothing. |
| `Adornment list not found.` | `adornmentList` on a component whose adornment list could not be resolved. |
| `Unsupported adornment type` | The adornment exists but has no registered handler. |
| `The <type> adornment does not currently support <action> requests.` | `create` or `update` for one of the read-only types above. |
| `Not a(n) <type> adornment.` | Internal type mismatch between the resolved adornment and its handler. |
| `Adornment not supported by plot type.` | The adornment cannot be displayed by the graph's current plot type. |
| `The current plot type does not support Percent.` | `create` with `type: "Percent"` on a plot that cannot show percentages. |
| `A values object is required for this request.` | `create`, `update` or `delete` sent without `values`, or without `values.type`. |
