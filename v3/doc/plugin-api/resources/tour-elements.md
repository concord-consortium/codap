# tourElements

> **Applies to:** CODAP v3 · **Verified:** 2026-09-25 against `main` @ `ae2105cf4`
> · Parts of this page are generated — see [conventions](../conventions.md).

Returns the registry of CODAP UI elements a guided tour can point at. Each entry gives a CSS
selector for the element plus a default title and description, so a tour plugin can highlight
"the File menu" without hard-coding CODAP's internal markup.

This exists so tours do not break when CODAP's DOM changes. A plugin that selects
`.menu-bar-left .file-menu-button` itself will break the next time that class is renamed; a
plugin that asks for `menuBar.fileMenu` will not.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | ✓ |
| `create` | — |
| `update` | — |
| `delete` | — |
| `notify` | — |
| `register` | — |
| `unregister` | — |
<!-- END GENERATED: actions -->

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `tourElements` | get |
<!-- END GENERATED: selectors -->

The whole registry is returned at once; there is no selector for an individual element. This
resource is **not** scoped to a data context, so the default-data-context rule does not apply.

## Values

`get` takes no `values`. The result is an object keyed by **namespaced element name**,
`<namespace>.<element>`:

<!-- BEGIN GENERATED: values -->
| Property | Type | Notes |
|---|---|---|
| `<namespace>.<element>` | Object | One entry per registered element. The key is flattened from the two-level internal registry. |
| `<...>.selector` | String | CSS selector locating the element in CODAP's DOM. |
| `<...>.title` | String | Default popover title. |
| `<...>.description` | String | Default popover description. |
<!-- END GENERATED: values -->

Namespaces as of this writing: `menuBar` (7 elements), `toolShelf` (12) and `workspace` (1) —
20 in total. Treat the set as open: read what comes back rather than hard-coding names, since
elements are added as CODAP's UI grows.

A tour is free to override `title` and `description`; they are defaults for convenience, not
required text.

## Examples

**Fetch the registry.**

```json
{
  "action": "get",
  "resource": "tourElements"
}
```

```json
{
  "success": true,
  "values": {
    "menuBar.container": {
      "selector": "[data-testid=\"codap-menu-bar\"]",
      "title": "Menu Bar",
      "description": "This is the menu bar, where you'll find file management, help, and settings."
    },
    "menuBar.fileMenu": {
      "selector": ".menu-bar-left .file-menu-button",
      "title": "File Menu",
      "description": "This is the File menu. Use it to create, open, save, and import documents."
    }
  }
}
```

**Use an entry to position a tour step.**

```js
// sendRequest stands for however your plugin sends requests — see Request shape in the index.
sendRequest({ action: 'get', resource: 'tourElements' }, function (result) {
  if (!result.success) return
  const step = result.values['toolShelf.table']
  if (step) {
    showPopover(document.querySelector(step.selector), step.title, step.description)
  }
})
```

Guard for a missing key, as above: an element your tour expects may not exist in the CODAP
version the user is running.

## Notifications

This resource emits none. The registry is static for a given CODAP build.

## Errors

This handler returns no error results — `get` always succeeds. An element that does not exist is
simply absent from the returned object rather than reported as an error.

## See also

The design document behind the tour API, written for CODAP developers but useful for background:
[`../../plugin-tour-api.md`](../../plugin-tour-api.md).
