# Plugin Request Processing

This document describes how CODAP v3 receives, queues, batches, and responds to plugin (data
interactive) API requests — in particular the request-coalescing layer that keeps CODAP
responsive when a plugin streams many case-creation requests in rapid succession (CODAP-1408).

## Pipeline

```
Plugin iframe                          CODAP
─────────────                          ─────
codapInterface.sendRequest()
   -> postMessage  ────────────────►  iframe-phone handler
      (one browser macrotask             (use-data-interactive-controller.ts for plugin tiles,
       per request)                       embedded-server.ts when CODAP itself is embedded)
                                            |
                                            ▼
                                       RequestQueue.push({ request, callback })
                                         stamps enqueuedAt = performance.now()
                                            |
                                            ▼  (MobX reaction on queue length + editing gate)
                                       scheduleDrain() ──► setTimeout(drain, 0)
                                                              |
                              ┌───────────────────────────────┘
                              ▼
                        drain()  — ONE work unit per tick
                              |
                              ▼
                        takeNextWorkUnit(queue.items, maxRunLength)
                          (request-coalescer.ts)
                              |
              ┌───────────────┴────────────────┐
              ▼                                ▼
        "single" unit                   "coalesced" unit
        (anything else)                 (run of ≥2 consecutive
              |                          create-item requests)
              ▼                                ▼
        processRequest()                resolveResources() once, then
          -> resolveResources()         createItemsInSegments(dataContext, segments)
          -> registered handler           (item-handler.ts: ONE applyModelChange /
              |                            addCases / validateCases / notification round)
              ▼                                |
        callback(result)                       ▼
                                        callback(perSegmentResult) for each
                                        original request, in order
                              |
                              ▼
                        more work queued? ──► scheduleDrain() (next tick)
```

Between drain ticks the browser is free to render, so tiles repaint between batches and a
streaming plugin's data appears in visible chunks rather than all at once.

## Why the drain is deferred

Each plugin request arrives as its own `postMessage` event — its own browser macrotask — and
most handlers are synchronous, so a request pushed and processed inline would always complete
before the next message event could even be delivered. The queue would never hold more than
one request, and there would be nothing to coalesce. Deferring the drain by one macrotask
(`setTimeout(0)`) lets all already-delivered message events land in the queue first; during a
flood, browsers prioritize message events over timer callbacks, so many requests accumulate
per tick. The cost is one macrotask (~0–4 ms) of added latency per request — invisible next
to the postMessage round trip itself.

## Coalescing

`takeNextWorkUnit()` (`src/data-interactive/request-coalescer.ts`) examines the head of the
queue. A run of two or more consecutive requests is merged into one "coalesced" work unit
when every request in the run:

| Rule | Rationale |
|---|---|
| is a single action, not an array request | array requests already batch their actions and may mix resources |
| has `action: "create"` | only creates have the per-add tile-reactivity cost and mergeable semantics |
| targets resource type `item` (e.g. `dataContext[X].item`) | item creates are order-independent appends; `case` creates carry parent references (see Future extensions) |
| has the identical resource string as the rest of the run | same dataContext (including the `#default` case) |
| has `values` present | a create without values is an error; let the normal path report it |

Anything else — gets, updates, `selectionList` creates, array requests — is a "single" unit
and is processed exactly as it would have been without coalescing. Only *consecutive* runs
merge, so request order is always preserved.

## Batch sizing

The drain recomputes the maximum run length from the live queue on every tick
(`src/data-interactive/data-interactive-request-processor.ts`):

```
headWaitMs = performance.now() − queue.head.enqueuedAt
urgency    = min(1, headWaitMs / kCoalesceMaxQueueWaitMs)            // 1000 ms
maxRun     = max( kMinCoalescedCreateRequests,                       // 5
                  ceil(queueLength / kCoalesceBacklogDivisor),       // 1/10 of backlog
                  ceil(queueLength × urgency) )
```

Two adaptive signals:

- **Backlog-proportional** — each tick takes up to 1/10 of the queue (floor 5). Small
  backlogs stream in fine-grained batches; large ones grow the batch so processing keeps up.
  This adapts to machine speed *implicitly*: on a slower machine each tick takes longer, more
  requests accumulate between ticks, and the batch grows accordingly — no timing measurement
  needed.
- **Queue-wait urgency** — plugin request timers are conventionally ~2 s; as the head
  request's wait approaches 1 s, the batch ramps up to the entire backlog, because timely
  acknowledgment outranks streaming granularity. Since a flood's tail requests have been
  waiting since the flood began, this also self-accelerates the tail of a large drain rather
  than dribbling it out at the minimum batch size.

## Batched execution and response slicing

A coalesced run executes via `createItemsInSegments(dataContext, segments)`
(`src/data-interactive/handlers/item-handler.ts`), where each segment is one original
request's values. All segments' items are added in a single `applyModelChange` — one
`addCases`, one `validateCases`, one round of `createCases` notifications — which is the
entire point: one cascade of tile reactivity per batch instead of per request. The item
handler's own `create` is simply the single-segment case, so the un-coalesced path shares the
same code.

Each original request still receives *its own* response, equivalent to what sequential
processing would have returned:

- **`itemIDs`** — positional: `addCases` returns item ids in input order, so segment *k*
  gets its slice.
- **`caseIDs`** — each *new* case is attributed to the segment containing its earliest
  contributing item (via `caseInfoMap.get(caseId).childItemIds`). This reproduces sequential
  semantics exactly: in the childmost collection, cases map 1:1 to items; in parent
  collections, a new case is reported by the first request whose item formed it, and later
  requests join the existing case without re-reporting it. During pure adds every new case
  has at least one contributing item from the batch (a new item whose parent values match an
  existing case joins that case rather than creating a new one).

## Failure handling

If a batched create cannot proceed — the dataContext doesn't resolve, the call throws, or any
segment reports failure — the run's members are processed individually through the normal
single-request path, preserving exact sequential semantics (including per-request error
messages). A coalescing bug therefore degrades to "no worse than unbatched."

## Plugin-visible semantics

- **Ordering** is preserved: work units are processed serially in queue order, and a batch's
  callbacks fire in request order.
- **Per-request responses** are unchanged in shape and content (see slicing above).
- **Acks arrive in clumps**: a batch's responses are delivered together at its drain tick.
  At scale every ack arrives *earlier* than it would have unbatched.
- **Latency**: every request gains one macrotask (~0–4 ms) from the deferred drain.
- **Notifications**: plugins observing the dataContext receive fewer, larger `createCases`
  notifications (one per collection per batch; the notification format already carries
  arrays).
- **Animation**: graphs/maps animate ordinary case additions (a user-entered row, a paced
  plugin create, a single bulk create of many items) but snap for coalesced batches — the
  batch is the "high-speed stream" discriminator. See the `suppressAnimation` option on
  `addCases` (`data-set-types.ts`) and its consumer in `data-configuration-model.ts`.
- **Cell editing**: the drain pauses while a blocking cell edit is in progress and catches up
  (coalesced) when it ends.
- **Undo**: plugin-initiated creates are not undoable (no `undoStringKey`), batched or not.

## Plugin traffic patterns

The eligibility rules were shaped by how real plugins actually emit data:

- **Simmer** (and similar codapInterface helpers) fires one single-item
  `create dataContext[X].item` per case, ALL up front, each with its own ~2 s timeout timer —
  the motivating flood. Without coalescing, cumulative processing time grows O(N²) over the
  stream and the acks for later requests blow their deadlines.
- **Sampler** sends one `createItems` per *sample* (an array of that sample's items),
  strictly alternating with `create dataContext[X].selectionList`, paced by its animation on
  an rAF cadence. The alternation means its creates never coalesce — and never need to, since
  the pacing keeps the backlog at zero. In Fastest mode it self-batches into one or two large
  `createItems` calls.
- **Collaborative** wraps item values in `{ id, values: {...} }` and supplies explicit item
  ids — both honored by the shared normalization in `createItemsInSegments`.

## Limits and future extensions

- The practical ceiling for a one-item-per-request flood is governed by the per-batch tile
  re-render cost, which grows with total dataset size N (each batch repositions all N points
  and syncs the whole table). Reducing that per-batch cost is graph/table-side work, not
  request-layer work.
- **`case` creates** (`collection[X].case`) are not coalesced. They carry parent references,
  which complicates merging; a likely simplification if a streaming plugin ever needs it is
  to coalesce only child-collection cases of a single parent.
- **`selectionList` creates** are not coalesced. If a Sampler-like create/select-alternating
  stream ever backs up, options are coalescing selection replacements (last-write-wins) or
  treating a create+select pair as one work unit.

## Debugging

- localStorage `debug` flag `noCoalesce` (`DEBUG_NO_COALESCE`) limits every run to one
  request, processing each individually for A/B comparison. Like all debug flags it is read
  once at module load — reload the page after changing it.
- `debug` flag `plugins` (`DEBUG_PLUGINS`) logs every request and response.
