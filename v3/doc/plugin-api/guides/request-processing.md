# How CODAP processes requests

> **Applies to:** CODAP v3 · **Verified:** 2026-10-16

Most plugins can treat CODAP as answering each request in turn. This chapter is for the ones that
cannot: plugins that send many requests quickly, stream data in, or need to know exactly when a
change has been applied.

## Order and responses

**Requests from your plugin are processed one at a time, in the order you sent them, and each
gets exactly one response.** No request overtakes an earlier one. A later request sees the
effects of every earlier one, so you can send a `create` and then a `get` without waiting for the
first response.

Each plugin has its own queue. CODAP makes no promise about the order of requests from two
different plugins.

CODAP itself never times a request out. The time limit a plugin sees comes from the library it
sends with: iframe-phone gives up after about two seconds and reports a timeout, though CODAP is
still working through the queue and its reply may arrive later. Keep that in mind when you send
many requests at once: the last of them can wait behind all the others.

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
a failure are not undone.

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

CODAP helps when a plugin streams one case per request anyway. When several single `create`
requests for the same `dataContext[...].item` resource are waiting next to each other in the
queue, CODAP applies them together as one change. A plugin sees three effects:

- **Each request still gets its own response**, with the same `itemIDs` and `caseIDs` it would
  have had alone.
- **Responses arrive in clumps**, all of a batch's together.
- **Notifications are combined.** A batch sends one `createCases` notification per collection
  for all its requests, before any of their responses. Do not count `createCases` notifications
  to count requests or cases; read the case ids they carry.

Only consecutive item creates with the same resource are combined. Anything else between them —
a `get`, a selection change, a create on another data context — ends the run, so the order of
your requests is always kept. Creates on `case` and array requests are never combined.

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
wait, including `get`s. A plugin that polls sees its responses arrive late while the user types.

The setting defaults to `false`, is saved with the document, and is new in v3.

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
