# Quick reference

> **Applies to:** CODAP v3 · Everything on this page is generated from `v3/src/` — see
> [conventions](conventions.md). Do not edit it by hand.

Three tables that answer the questions people get wrong most often: whether a resource supports
the action you are about to send, what a selector may contain, and what an error string means.
For prose about any one resource, see [the index](README.md).

---

## Resource × action

Which actions each resource's handler implements. Sending an unsupported action is the most
common failure, and this is the complete answer.

A `✓` means the handler defines that action. It does **not** promise the action succeeds for every
target — `adornment` accepts `create`, but only for some adornment types, and `delete` on a type
that was never shown returns an error. The resource's own page carries those conditions.

<!-- BEGIN GENERATED: resource-actions -->
| Resource | `get` | `create` | `update` | `delete` | `notify` | `register` | `unregister` |
|---|---|---|---|---|---|---|---|
| `adornment` | ✓ | ✓ | ✓ | ✓ | — | — | — |
| `adornmentList` | ✓ | — | — | — | — | — | — |
| `allCases` | ✓ | — | — | ✓ | — | — | — |
| `attribute` | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| `attributeList` | ✓ | — | — | — | — | — | — |
| `attributeLocation` | — | — | ✓ | — | — | — | — |
| `case` | — | ✓ | ✓ | — | — | — | — |
| `caseByID` | ✓ | — | ✓ | ✓ | — | — | — |
| `caseByIndex` | ✓ | — | ✓ | ✓ | — | — | — |
| `caseCount` | ✓ | — | — | — | — | — | — |
| `caseFormulaSearch` | ✓ | — | — | — | — | — | — |
| `caseSearch` | ✓ | — | — | — | — | — | — |
| `collection` | ✓ | ✓ | ✓ | ✓ | — | — | — |
| `collectionList` | ✓ | — | — | — | — | — | — |
| `component` | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| `componentList` | ✓ | — | — | — | — | — | — |
| `configuration` | ✓ | — | ✓ | — | — | — | — |
| `configurationList` | ✓ | — | — | — | — | — | — |
| `dataContext` | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| `dataContextFromURL` | — | ✓ | — | — | — | — | — |
| `dataContextList` | ✓ | — | — | — | — | — | — |
| `dataDisplay` | ✓ | — | — | — | — | — | — |
| `document` | ✓ | — | ✓ | — | — | — | — |
| `formulaEngine` | ✓ | — | — | — | ✓ | — | — |
| `global` | ✓ | ✓ | ✓ | — | — | — | — |
| `globalList` | ✓ | — | — | — | — | — | — |
| `interactiveApi` | ✓ | — | — | — | — | — | — |
| `interactiveFrame` | ✓ | — | ✓ | — | ✓ | — | — |
| `item` | ✓ | ✓ | ✓ | ✓ | — | — | — |
| `itemByCaseID` | ✓ | — | ✓ | ✓ | — | — | — |
| `itemByID` | ✓ | — | ✓ | ✓ | — | — | — |
| `itemCount` | ✓ | — | — | — | — | — | — |
| `itemSearch` | ✓ | — | — | ✓ | ✓ | — | — |
| `logMessage` | — | — | — | — | ✓ | — | — |
| `logMessageMonitor` | — | — | — | — | — | ✓ | ✓ |
| `selectionList` | ✓ | ✓ | ✓ | — | — | — | — |
| `tourElements` | ✓ | — | — | — | — | — | — |
| `undoChangeNotice` | — | — | — | — | ✓ | — | — |
<!-- END GENERATED: resource-actions -->

---

## Selector grammar

The reference teaches selectors mostly by example. This is the actual grammar, so you can tell
whether a selector you have constructed will parse before sending it.

<!-- BEGIN GENERATED: selector-grammar -->
A resource selector is a dot-separated chain of segments. Each segment is a key, optionally
followed by a name or id in square brackets:

```
selector  := segment ( "." segment )*
segment   := key ( "[" nameOrId "]" )?
nameOrId  := a name, a title, or a numeric id — or #default for a data context
```

**Valid keys** (24): `attribute`, `attributeLocation`, `attributes`, `case`, `caseByID`, `caseByIndex`, `caseFormulaSearch`, `caseSearch`, `collection`, `component`, `configuration`, `dataContext`, `dataContextList`, `dataDisplay`, `global`, `interactiveApi`, `interactiveFrame`, `item`, `itemByCaseID`, `itemByID`, `itemSearch`, `logMessage`, `tourElements`, `type`.

A key not in that list does not parse, and the request fails rather than being ignored.

**Data-context defaulting.** When a selector omits `dataContext`, CODAP supplies `#default`,
which resolves to the first data context in the document. That does not apply to these
resource types: `component`, `componentList`, `dataContextList`, `dataDisplay`, `document`, `formulaEngine`, `global`, `globalList`, `interactiveApi`, `interactiveFrame`, `logMessage`, `logMessageMonitor`, `undoChangeNotice`, `undoableActionPerformed`. Nor does it apply when creating a data context, since there is
nothing to default to yet.
<!-- END GENERATED: selector-grammar -->

---

## Error catalog

Every error string the Data Interactive API can return, alphabetically. A `<value>` is filled in
at runtime with the offending name, type or action; an individual resource's page may name those
placeholders more specifically where it knows what they hold.

A "prebuilt result" is a named result the code reuses; where the column shows `—`, the error is
constructed at its call site. That distinction matters only if you are reading CODAP's source —
the string is what reaches your plugin.

<!-- BEGIN GENERATED: error-catalog -->
| Error | Prebuilt result |
|---|---|
| `<value1> <value2>: <value3> required` | — |
| `<value1> contains an invalid attribute name or ID.` | — |
| `<value1> selectionList requires a list of case IDs.` | — |
| `A values object is required for this request.` | `valuesRequiredResult` |
| `Action handler returned undefined.` | — |
| `Adornment list not found.` | `adornmentListNotFoundResult` |
| `Adornment not found.` | `adornmentNotFoundResult` |
| `Adornment not supported by plot type.` | `adornmentNotSupportedByPlotTypeResult` |
| `An error occurred while processing the request.` | — |
| `Attribute not found` | `attributeNotFoundResult` |
| `Cannot assign <value1> to <value2>` | — |
| `Cannot create multiple sliders for <value>` | — |
| `Case not found` | `caseNotFoundResult` |
| `Collection not found` | `collectionNotFoundResult` |
| `Component does not support rescale` | — |
| `Component not found` | `componentNotFoundResult` |
| `Could not create component` | — |
| `Current plot type does not support fusing points into bars` | — |
| `DataContext not found` | `dataContextNotFoundResult` |
| `DataDisplay not found` | `dataDisplayNotFoundResult` |
| `DataSetMetadata not found for <value>` | — |
| `error creating global value` | — |
| `Failed to download and import CSV: <url>` | — |
| `Global not found: <value>` | — |
| `global values must be numbers` | — |
| `globals must have unique names` | — |
| `Interactive Frame not found` | `noInteractiveFrameResult` |
| `Internal error prevented color map access` | `noColorMapAccessResult` |
| `Invalid bar chart scale: <value>` | — |
| `Invalid record for evaluation` | — |
| `Invalid values provided for update.` | `invalidValuesProvidedResult` |
| `Item not found` | `itemNotFoundResult` |
| `missing global or value` | — |
| `No action to process.` | — |
| `Not a(n) <value1> adornment.` | — |
| `Not found` | — |
| `The <value1> adornment does not currently support <value2> requests.` | — |
| `The current plot type does not support Percent.` | — |
| `Unable to parse query.` | `couldNotParseQueryResult` |
| `unknown request: <value>` | — |
| `Unsupported action: <value>/<value>` | — |
| `Unsupported adornment type` | `adornmentNotSupportedResult` |
| `Unsupported animationDirection <value>` | — |
| `Unsupported animationMode <value>` | — |
| `Unsupported component type <value>` | — |
| `Unsupported dateUnit <value>` | — |
| `Unsupported scaleType <value>` | — |
<!-- END GENERATED: error-catalog -->
