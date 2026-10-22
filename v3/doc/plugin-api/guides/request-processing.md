# How CODAP processes requests

> **Applies to:** CODAP v3 · **Verified:** 2026-10-22

Most plugins can treat CODAP as answering each request in turn. This chapter is for the ones that
cannot: plugins that send many requests quickly, stream data in, or need to know exactly when a
change has been applied.

## Order and responses

**Requests from your plugin are processed one at a time, in the order you sent them, and each
gets exactly one response.** No request overtakes an earlier one, and nearly every request has
finished its work before the next one starts, so you can send a `create` and then a `get` without
waiting for the first response.

The queue guarantees order, not completion. A few requests reply at once and finish their work
afterwards: `update` on [`document`](../resources/document.md#update--replacing-the-document)
replies `success` before the new document is in place, so a request sent after it, even in the
same array, can still see the old document. Wait for the `updateDocumentEnded` notification before
sending anything that depends on the replacement.

Each plugin has its own queue. CODAP makes no promise about the order of requests from two
different plugins.

CODAP itself never times a request out. The time limit a plugin sees comes from the library it
sends with: iframe-phone gives up after two seconds and calls your callback with no reply and an
error, though CODAP is still working through the queue. When CODAP's reply does arrive, iframe-phone
calls the same callback again, this time with the reply, so a callback must cope with being called
twice. Keep that in mind when you send many requests at once: the last of them can wait behind all
the others.

The [codap-plugin-api](https://github.com/concord-consortium/codap-plugin-api) library handles this
for you. From version 0.2.0 its `sendRequest` ignores iframe-phone's two-second limit and waits for
CODAP's actual reply, settling once with it. It applies its own limit instead, 60 seconds by
default, which `codapInterface.setRequestTimeout` changes.

Requests still waiting when your plugin is closed or reloaded get no response.

## Array requests

A request can be an array of envelopes. CODAP processes them in order and replies with an array
of responses, one per envelope:

```json
[
  { "action": "get", "resource": "dataContext[Mammals].selectionList" },
  { "action": "get", "resource": "dataContext[Reptiles].selectionList" }
]
```

```json
[
  { "success": true, "values": [ { "caseID": 12, "collectionID": 4, "collectionName": "Cases" } ] },
  { "success": false, "values": { "error": "DataContext not found" } }
]
```

A failure does not stop the rest: each envelope succeeds or fails on its own, and the ones before
a failure are not undone. One kind of failure currently breaks this; see
[Known limitations](#known-limitations).

An array request is a convenience, not a transaction. It saves round trips, but each envelope is
still a separate change.

## Sending many cases

**Send cases in as few requests as you can.** A `create` on `item` accepts an array, and one
request with a thousand items is far faster than a thousand requests with one each:

```json
{
  "action": "create",
  "resource": "dataContext[Mammals].item",
  "values": [
    { "Animal": "Ocelot", "Height": 0.5, "Weight": 12 },
    { "Animal": "Lion", "Height": 1.2, "Weight": 190 }
  ]
}
```

Each request that adds cases makes every graph and table showing the data redraw, and that cost
grows with the size of the data set. Thousands of single-item requests sent at once therefore
slow CODAP down and, without help, would run past the two-second limit.

CODAP helps when a plugin streams one case per request anyway. When several `create` requests
on `item` with exactly the same resource are waiting next to each other in the queue, CODAP
applies them together as one change. Each request can carry one item or many. The resources must
match character for character: `dataContext[Mammals].item` and `dataContext[mammals].item` are
not combined. A plugin sees three effects:

- **Each request still gets its own response**, with the same `itemIDs` and `caseIDs` it would
  have had alone.
- **Responses arrive in clumps**, all of a batch's together. A long run is applied in several
  batches, not one; batches grow larger the longer the queue and the longer its requests have
  waited.
- **A failure fails the whole batch.** If applying the batch fails, every request in it gets
  `An error occurred while processing the request.`, and some of the batch's cases may already
  have been added.
- **Notifications are combined.** A batch sends one `createCases` notification per collection
  for all its requests, before any of their responses. Do not count `createCases` notifications
  to count requests or cases; read the case ids they carry.

Only consecutive item creates with the same resource are combined. Anything else between them —
a `get`, a selection change, a create on another data context — ends the run, so the order of
your requests is always kept. Creates on `case`, and requests sent as an array of envelopes, are
never combined.

## Requests while the user is editing

A plugin that keeps data in step with another source — a collaborative plugin, for example —
risks overwriting a value the user is typing. Setting `blockAPIRequestsWhileEditing` on
`interactiveFrame` prevents that:

```json
{
  "action": "update",
  "resource": "interactiveFrame",
  "values": { "blockAPIRequestsWhileEditing": true }
}
```

It takes effect for data contexts your plugin manages, which it names with `managingController`
on [`dataContext`](../resources/data-context.md). While the user edits a case table cell in one of
those data contexts, CODAP holds back plugin requests until the edit ends, then processes them in
order. Nothing is dropped.

The hold starts only once the user has actually changed the cell's value, and ends when the cell
editor closes. It applies only to case table cells, not to the case card or to attribute names.

**The hold applies to every plugin, not only yours.** While it lasts, requests from all plugins
wait, including `get`s, so a plugin that polls sees its responses arrive late while the user
types. See [Known limitations](#known-limitations).

The setting defaults to `false` and is new in v3. It is saved with the document, but the
`managingController` it depends on is not: after the document is reopened, nothing is held until
your plugin names itself with `managingController` again. Send both every time your plugin
loads.

## Known limitations

**An array request that fails partway can reply with a single error.** If processing throws
inside one envelope, CODAP stops there and replies with one error object,
`An error occurred while processing the request.`, rather than an array. The envelopes before it
have taken effect, the later ones have not, and the reply does not say which. v2 reported the
error in that envelope's place and went on with the rest, which is the intended behavior. This is
a known bug. Until it is fixed, check whether the reply is an array before reading it.

**Data notifications are not combined as v2 combined them.** v2 sent one data-change notification
per request, whose `values` was an array of every change the request made. v3 sends one
notification per change, with `values` a single object. This is a known bug; see
[the notification catalog](../notifications.md#known-limitations).

**`blockAPIRequestsWhileEditing` holds back every plugin.** Only the plugin that manages the data
context needs to wait while its data is being edited, but requests from all plugins wait.

## See also

- [The resource index](../README.md) for the request and response shapes
- [`interactiveFrame`](../resources/interactive-frame.md) for `blockAPIRequestsWhileEditing`
- [`dataContext`](../resources/data-context.md) for `managingController`
- [The notification catalog](../notifications.md#data-changes--datacontextchangenoticecontext)
  for `createCases` and the other data notifications
- [Undo and redo](undo-and-redo.md): requests your plugin makes are not on CODAP's undo history
