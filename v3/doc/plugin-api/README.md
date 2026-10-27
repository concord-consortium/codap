# CODAP Data Interactive Plugin API

> **Applies to:** CODAP v3 · **Verified:** 2026-10-22
> · Parts of this reference are generated — see [conventions](conventions.md).

This reference is for developers writing CODAP plugins. It describes the API through which a
plugin interacts with the CODAP document it runs in, and sends data for other CODAP components
to present.

## About plugins

A plugin is a kind of component that can be placed in a CODAP document. Its usual role is to
provide CODAP with data for analysis. For example, the Data Games plugins send CODAP the data
generated while a student plays a simple video game. By analyzing that data, students can learn
how to improve their play. The
[InquirySpace project](https://concord.org/our-work/research-projects/inquiryspace/) created
plugins for investigating the physical world with sensors and simulations: a student performs an
experiment and then sends the data it produced to CODAP for immediate analysis.

Plugins are loosely coupled to CODAP. A plugin need not be served from the same web server as
the CODAP it runs in. It runs in an iframe and communicates with CODAP through `postMessage`.

## About iframe-phone

The API uses [iframe-phone](https://github.com/concord-consortium/iframe-phone) to carry messages
between a plugin and CODAP. iframe-phone wraps the `postMessage` API: it simplifies setting up the
connection and provides a simple remote procedure call (RPC) interface.

CODAP defines the structure of the requests and responses that pass through the connection. In
most cases the plugin sends a request and passes a callback to receive the response. Some
messages start from CODAP's side, such as notifications; the mechanics are the same in either
direction. See [Sending requests and receiving notifications](#sending-requests-and-receiving-notifications)
for how a plugin connects.

Most plugins are better off with the
[codap-plugin-api](https://github.com/concord-consortium/codap-plugin-api) library
(`@concord-consortium/codap-plugin-api` on npm), which sets up the iframe-phone connection and
wraps it in a `sendRequest` that returns a promise. From version 0.2.0 it also copes with
iframe-phone's two-second timeout for you; see
[How CODAP processes requests](guides/request-processing.md#order-and-responses).

## Status of this reference

**This reference replaces the
[wiki page](https://github.com/concord-consortium/codap/wiki/CODAP-Data-Interactive-Plugin-API).**
Every resource now has a complete, self-contained page in this folder, except `tourElements`,
which is not yet documented anywhere. The wiki page will be frozen as the **CODAP v2**
reference.

---

## Terminology

The wiki page used these interchangeably. This reference does not — use the canonical term.

| Canonical | Also seen as | Notes |
|---|---|---|
| **plugin** | data interactive, DI, interactive | The iframe'd application talking to CODAP. "Data interactive" is the older term and survives in API names like `interactiveFrame`. |
| **data context** | data set, dataContext | The container for a set of related cases. `dataContext` is the API spelling; "data set" is the UI term for the same thing. |
| **collection** | — | A level in a data context's hierarchy. A data context has one or more. |
| **attribute** | column, field | A property of a case. May carry an explicit `type`; if it does not, CODAP infers one — numeric, date, color, boundary or categorical — from the attribute's current values, and the inferred type can change as those values change. |
| **case** | row | A grouping of items at one collection level. Each case is *in* exactly one collection. |
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

A request may also be an array of envelopes. CODAP processes them in order and replies with an
array of responses, one per envelope, except in one known case; see
[How CODAP processes requests](guides/request-processing.md#known-limitations).

### Response shape

Every request gets one response, unless your plugin is closed or reloaded before CODAP reaches
it. On success, `success` is `true` and `values` holds what the
action returns — here, the reply to the `attributeList` request above:

```json
{
  "success": true,
  "values": [
    { "name": "Species", "id": 31, "title": "Species" },
    { "name": "Mass", "id": 32, "title": "Mass" }
  ]
}
```

What `values` holds depends on the resource and the action; each resource page shows it. Some
actions return no `values` at all, only `{ "success": true }`. Two put their results beside
`values` rather than in it, at the top level of the response: `create` on
[`item`](resources/item.md) returns `itemIDs` and `caseIDs`, and `update` on
[`case`](resources/case.md) returns `caseIDs`.

On failure, `success` is `false` and `values.error` usually holds a message:

```json
{
  "success": false,
  "values": { "error": "DataContext not found" }
}
```

Test `success` before reading `values`: a failed request carries no data, at most an error. And
do not assume the error is there: a few failures reply with no `values` at all, such as `update`
on [`item`](resources/item.md) when no id matches, so read the message with a guard, for example
`result.values?.error`. Each resource page lists the messages it can return, and when, in its
**Errors** table. A few can come from any request:

| Error | Condition |
|---|---|
| `Unsupported action: <action>/<resource>` | the resource does not exist, or does not support the action |
| `No action to process.` | the request was empty |
| `Action handler returned undefined.` | the handler produced no response — a defect in CODAP |
| `An error occurred while processing the request.` | the handler failed unexpectedly — a defect in CODAP |

### Sending requests and receiving notifications

[The notification catalog](notifications.md) lists them, grouped by what changed, and
[says which plugins receive each one](notifications.md#receiving-them), including whether you
hear about your own changes.


CODAP and a plugin talk over [iframe-phone](https://github.com/concord-consortium/iframe-phone).
A plugin sets up an endpoint, passing a handler CODAP calls when it has something to say:

```js
const phone = new iframePhone.IframePhoneRpcEndpoint(
  requestHandler, "data-interactive", window.parent)
```

Two directions, and they are not symmetrical:

- **Plugin → CODAP.** Send a request envelope and get one response. Throughout this reference
  that is written `sendRequest(request, callback)`; it stands for however your plugin sends —
  `phone.call(...)` directly, or a helper library's wrapper. This reference documents the
  messages, not any particular client.
- **CODAP → plugin.** CODAP calls your `requestHandler(command, callback)` with a `notify`
  message. This is how notifications arrive — a case was selected, a document was delivered, a
  component's title changed. Inspect `command.resource` and `command.values.operation` to decide
  what it is, and call `callback` when you are done:

```js
function requestHandler (command, callback) {
  if (command.resource === "documentChangeNotice") {
    // command.values.operation is "updateDocumentBegun" or "updateDocumentEnded"
  }
  callback({ success: true })
}
```

Some resources deliver their real payload through this channel rather than in a response — see
[`document`](resources/document.md), whose `get` replies `{"success": true}` and sends the
document afterwards as a notification.

---

**Treat ids as opaque, and pass back exactly what CODAP gave you.**

Most ids in this API are numbers — attributes, cases, collections, components, items. CODAP v3
uses prefixed strings internally (`ATTR...`, `DATA...`) and converts them at the boundary, so
constructing a request from a v3 internal string id will not resolve.

Some resources are exceptions and return their internal string id directly:

| Resource | Id it returns |
|---|---|
| `adornment`, `adornmentList` | The adornment's `ADRN...` string. The selector matches on it, so round-tripping works. |
| `logMessageMonitor` | `clientId` is intended to be the plugin's own value, as in v2. v3 currently reports the plugin's tile id string instead, a known bug; see [`logMessageMonitor`](resources/log-message-monitor.md#known-limitations). |

This is why "pass back what you were given" is the reliable rule: it holds for both cases,
whereas "ids are numbers" does not. Do not parse an id, construct one, or assume its type.

---

## The default data context

Most resource selectors may omit the data context, in which case CODAP supplies `#default`, which
resolves to **your plugin's own data context**:

```json
{ "action": "get", "resource": "collection[Cases].attributeList" }
```

This is equivalent to naming `dataContext[#default]`. Your plugin's own data context is the one
it created most recently with `create dataContext` without naming a data context in the selector.
When a document is saved, CODAP records that link, and restores it when the document is opened
again. A plugin that has no data context of its own gets a not-found error for a request that
relies on the default.

> **Known limitation.** v3 does not yet follow this rule. It resolves `#default` to the first
> data context in the document, whichever plugin created it. In a document with one data context
> the result is the same; in a document with several, a plugin relying on the default can read or
> change another plugin's data. This is a known bug.

Two more things to know:

- Defaulting does **not** apply to these, which are not scoped to a data context:
  `component`, `componentList`, `dataContextList`, `dataDisplay`, `document`, `formulaEngine`,
  `global`, `globalList`, `interactiveApi`, `interactiveFrame`, `logMessage`,
  `logMessageMonitor`, `undoableActionPerformed`, `undoChangeNotice`. Note that
  `undoableActionPerformed` is an *operation* of the `undoChangeNotice` resource rather than a
  resource of its own; it appears in CODAP's exemption list all the same. v2's list differed
  slightly: it also exempted `configuration` and `configurationList`, and did not have
  `dataDisplay` or `interactiveApi`.
- It does not apply when you are **creating** a data context (`create dataContext` or
  `create dataContextFromURL`) — there is nothing to default to yet.

Until the known limitation above is fixed, relying on the default is fragile in a document with
more than one data context. Name the context explicitly.

---

## Resources

All 38 resources CODAP v3 registers, alphabetically. Pages marked *this repo* are current for
v3. `tourElements` is not yet documented.

| Resource | Documented in |
|---|---|
| **[`adornment`](resources/adornment.md)** | **this repo** |
| **[`adornmentList`](resources/adornment.md)** | **this repo** |
| **[`allCases`](resources/all-cases.md)** | **this repo** |
| **[`attribute`](resources/attribute.md)** | **this repo** |
| **[`attributeList`](resources/attribute-list.md)** | **this repo** |
| **[`attributeLocation`](resources/attribute-location.md)** | **this repo** |
| **[`case`](resources/case.md)** | **this repo** |
| **[`caseByID`](resources/case-by-id.md)** | **this repo** |
| **[`caseByIndex`](resources/case-by-index.md)** | **this repo** |
| **[`caseCount`](resources/case-count.md)** | **this repo** |
| **[`caseFormulaSearch`](resources/case-formula-search.md)** | **this repo** |
| **[`caseSearch`](resources/case-search.md)** | **this repo** |
| **[`collection`](resources/collection.md)** | **this repo** |
| **[`collectionList`](resources/collection.md)** | **this repo** |
| **[`component`](resources/component.md)** | **this repo** |
| **[`componentList`](resources/component-list.md)** | **this repo** |
| **[`configuration`](resources/configuration.md)** | **this repo** |
| **[`configurationList`](resources/configuration.md)** | **this repo** |
| **[`dataContext`](resources/data-context.md)** | **this repo** |
| **[`dataContextFromURL`](resources/data-context-from-url.md)** | **this repo** |
| **[`dataContextList`](resources/data-context-list.md)** | **this repo** |
| **[`dataDisplay`](resources/data-display.md)** | **this repo** |
| **[`document`](resources/document.md)** | **this repo** |
| **[`formulaEngine`](resources/formula-engine.md)** | **this repo** |
| **[`global`](resources/global.md)** | **this repo** |
| **[`globalList`](resources/global.md)** | **this repo** |
| **[`interactiveApi`](resources/interactive-api.md)** | **this repo** |
| **[`interactiveFrame`](resources/interactive-frame.md)** | **this repo** |
| **[`item`](resources/item.md)** | **this repo** |
| **[`itemByCaseID`](resources/item-by-case-id.md)** | **this repo** |
| **[`itemByID`](resources/item-by-id.md)** | **this repo** |
| **[`itemCount`](resources/item-count.md)** | **this repo** |
| **[`itemSearch`](resources/item-search.md)** | **this repo** |
| **[`logMessage`](resources/log-message.md)** | **this repo** |
| **[`logMessageMonitor`](resources/log-message-monitor.md)** | **this repo** |
| **[`selectionList`](resources/selection-list.md)** | **this repo** |
| `tourElements` | not yet documented |
| **[`undoChangeNotice`](resources/undo-change-notice.md)** | **this repo** |

---

## Guides

Narrative chapters covering behavior that spans resources — how CODAP processes requests, undo
and redo, language and locale, and embedding CODAP in a page — live in
**[`guides/`](guides/README.md)**.

The notifications CODAP sends to plugins are cataloged in **[`notifications.md`](notifications.md)**.

---

## For maintainers

[Conventions](conventions.md) — page layout, generated blocks, and the rules that keep pages
self-contained.

The plan driving this work is [`../plugin-api-doc-update-plan.md`](../plugin-api-doc-update-plan.md).
