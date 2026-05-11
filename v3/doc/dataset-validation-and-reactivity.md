# DataSet Validation & Reactivity

> **Audience:** Developers writing or reviewing code that observes data —
> components, adornments, formula machinery, plugin handlers — plus anyone
> reviewing changes to the `data/` model layer.
>
> **Companion docs:** [hierarchical-data.md](./hierarchical-data.md) (the
> conceptual model: items vs. cases vs. collections),
> [collection-properties.md](../src/models/data/collection-properties.md)
> (table of per-collection grouping structures and how they update).

## Why this exists

The DataSet/Collection/Attribute layer carries a lot of caching. Cases are
grouped lazily from items, and the grouping is expensive to recompute, so we
maintain plain (non-observable) caches and gate them behind a small set of
observable version counters. That works, but the cache-and-version pattern is
non-obvious: a UI component that "just reads the data" can silently fail to
re-render because the read it took did not establish the right MobX
dependency.

This document catalogs:

1. The **validation markers** (observable counters and plain flags) that
   gate the cached state.
2. The **observable surfaces** clients should read, and which of them
   establish dependencies for which kinds of change.
3. **Worked examples** showing how to choose the right observable for a
   given reactive need.

## Quick orientation

- An **item** is a row of raw values; items are the source of truth.
  `DataSet._itemIds` and `Attribute.strValues / numValues` hold them.
- A **case** is a group of one or more items that share values across the
  grouping attributes of a collection. With one (child) collection only, each
  case corresponds to one item (the case and the item have distinct ids).
- A **collection** is a set of attributes that participate in grouping at
  one level of the hierarchy. `DataSet.collections` is the parent-to-child
  ordered list.
- The case structures (`caseInfoMap`, per-collection `caseGroupMap`,
  `caseIds`, `caseIdToIndexMap`, etc.) are *derived* from items + grouping
  attributes. See [hierarchical-data.md](./hierarchical-data.md) for the
  conceptual model and [collection-properties.md](../src/models/data/collection-properties.md)
  for what each per-collection map holds.

The rest of this doc focuses on **how the derived state is invalidated and
revalidated** — that's where the markers live.

## The actors

| Actor                       | Role                                                                       | Key file                                       |
|-----------------------------|----------------------------------------------------------------------------|------------------------------------------------|
| `DataSet`                   | Root; owns items, attributes, collections, and the validation pipeline.    | `src/models/data/data-set.ts`                  |
| `CollectionModel`           | One level of the grouping hierarchy; owns its case-group caches.           | `src/models/data/collection.ts`                |
| `Attribute`                 | A "column"; holds the actual value arrays.                                 | `src/models/data/attribute.ts`                 |
| `DataSetMetadata`           | Selection-independent display state (hidden, collapsed, categories).       | `src/models/shared/data-set-metadata.ts`       |
| `FilteredCases`             | Per-tile case filter (e.g. graph dataConfig); observes a DataSet.          | `src/models/data/filtered-cases.ts`            |
| `CategorySet`               | Cached category order/colors for one categorical attribute.                | `src/models/data/category-set.ts`              |

DataSet, CollectionModel, Attribute, and DataSetMetadata are MST models.
FilteredCases is a plain class that uses MobX decorators directly.
CategorySet is an MST model with private MobX state.

Downstream consumers — notably `DataConfigurationModel` (the graph/dataConfig
layer that owns `FilteredCases` instances) — are out of scope for this doc,
but exhibit the same reactivity patterns and run into the same classes of
bugs: their own observable state (e.g. `_attributeDescriptions`) can be
mutated by patch-driven paths that bypass the action wrappers that would
otherwise invalidate caches. CODAP-1297 is the canonical example (see
Worked examples).

## The case-validation pipeline

Whenever items, hidden flags, filter results, or grouping-attribute values
change, the cached case structures are marked stale. They are *not*
recomputed eagerly; they are recomputed the next time something reads them.
The pipeline:

```
mutation
  └─> DataSet.invalidateCases([regrouping])
        ├─ sets _isValidCases = false
        ├─ if regrouping=true:
        │     - sets _needsRegrouping = true
        │     - calls collection.invalidateCaseGroups() on each collection
        │       (which sets _needsFullRebuild = true)
        └─ else (value-only):
              - sets _needsValueRevalidation = true
        └─ bumps _caseValidationVersion (the observable signal)

read
  └─> DataSet.validateCases()           // called by getCasesForCollection,
        ├─ early-out if _isValidCases   //   getStrValue, getValue, etc.
        ├─ if _needsRegrouping:
        │     - clears caseInfoMap, itemInfoMap
        │     - per collection: updateCaseGroups() then completeCaseGroups()
        │       (the latter bumps Collection._groupingChangeVersion)
        │     - clears _needsRegrouping
        ├─ else if _needsValueRevalidation:
        │     - per collection: recomputeNonEmptyCases()
        │       (bumps Collection._valueChangeVersion only)
        │     - clears _needsValueRevalidation
        └─ setValidCases()
              - bumps _caseValidationVersion
              - clears _isValidCases pending-flag false
```

A second, additive path exists for **appended items**. `addCases` calls
`validateCasesForNewItems(newIds)`, which invokes
`collection.invalidateCaseGroupsForNewCases(newIds)` and lets
`completeCaseGroups` take its append branch (concatenation rather than full
rebuild). This avoids an O(N) walk per append.

The additive path and the full-rebuild path use **different semantics for
`newCaseIds`**, the list returned by `updateCaseGroups` that drives the
APPEND branch. In the additive path, `newCaseIds` must include every newly-
created `caseGroupMap` entry — including ones whose case id was preserved
across a prior `clearCases()` (see [collection-properties.md][cp]) — because
APPEND consumes it as "what to extend `_cases` / `_caseGroups` with." In the
full-rebuild path, `newCaseIds` is consumed instead by `getRemappedCaseIds`,
which treats it as a list of remapping *candidates*; preserved-id cases must
be omitted there because they are by definition not candidates for being
remapped to a prior id. The push site in `Collection.updateCaseGroups`
encodes both rules.

A related invariant: APPEND and REBUILD are dual implementations of the same
observable surface (`_cases`, `_caseGroups`, `_nonEmptyCases`). Any property
REBUILD enforces by construction — notably "no hidden-only case groups",
because REBUILD walks `self.caseIds` which already excludes them — APPEND
must enforce by filtering, because it walks `newCaseIds` which doesn't.

[cp]: ../src/models/data/collection-properties.md

## Validation markers — full catalog

### `DataSet`

| Marker                           | Type            | Set by                                                                | Cleared by                  | Read by (getter)         |
|----------------------------------|-----------------|-----------------------------------------------------------------------|-----------------------------|--------------------------|
| `_caseValidationVersion`         | `observable.box`| `invalidateCases`, `setValidCases`, `invalidateItemIds`               | (counter; never cleared)    | `isValidCases`, `validationCount`, `needsRegrouping`, `needsValueRevalidation`, `itemIds`, `items` |
| `_isValidCases`                  | plain `boolean` | `setValidCases` (true) / `invalidateCases` (false)                    | by `setValidCases`          | `isValidCases`           |
| `_needsRegrouping`               | plain `boolean` | `invalidateCases(true)` (true)                                        | `clearNeedsRegrouping` (after rebuild) | `needsRegrouping`        |
| `_needsValueRevalidation`        | plain `boolean` | `invalidateCases(false)` (true)                                       | `clearNeedsValueRevalidation` (after recompute) | `needsValueRevalidation` |
| `_validationCount`               | plain `number`  | bumped in `setValidCases`                                             | (counter)                   | `validationCount`         |
| `_isValidItemIds` / `_invalidateItemIds()` | plain        | `invalidateItemIds`                                                   | `_validateItemIds` (lazy)   | `isValidItemIds`, `itemIds`, `items` |
| `_itemIdsHash`                   | `observableCachedFnFactory` | invalidated by `_invalidateItemIds`; incrementally invalidated by `appendItemIdsToCache` | (lazy recompute on read)  | `itemIdsHash`             |
| `_itemIdsOrderedHash`            | `observableCachedFnFactory` | invalidated by `_invalidateItemIds`; incrementally invalidated by `appendItemIdsToCache` | (lazy recompute on read)  | `itemIdsOrderedHash`      |

**Why the observable counter and the plain flags are split.** The plain
flags are *gates* — they decide whether `validateCases` should do work. The
observable counter is the *signal* — it tells reactive readers that
something changed, regardless of whether the work has happened yet.

The split is here for a specific reason: **MobX computed values (and MST
view getters) must be pure derivations**. A view that writes to an
observable — even via `runInAction` — silently breaks MobX's dependency
tracking. Reactions can fail to re-evaluate when their dependencies change.
This bit us in [CODAP-1086](https://concord-consortium.atlassian.net/browse/CODAP-1086)
(observable hash caches written from a view) and prompted the broader audit
in [CODAP-1117](https://concord-consortium.atlassian.net/browse/CODAP-1117).
The earlier design held cache-validity state in `observable.box`es that
were read *and written* from inside view getters. The current design moves
that state into plain (non-observable) variables — getters can write to
plain variables freely without violating MobX purity — and adds observable
counters (`_caseValidationVersion` on DataSet, `_groupingChangeVersion` and
`_valueChangeVersion` on Collection) that are bumped *only from action
contexts* and read from getters to establish the MobX dependency. Lazy
validation still works (the getter checks the plain flag and computes if
needed), but the observable surface is now action-write / view-read only.

That same constraint is also why every flag-returning getter
(`needsRegrouping`, `needsValueRevalidation`, `isValidCases`,
`isValidItemIds`) reads `_caseValidationVersion.get()` before returning the
plain flag: without that read, the getter is a closure with no observable,
and MobX memoizes its first return value forever. Following this pattern
when adding new flag getters is required, not optional.

The `_itemIdsHash` / `_itemIdsOrderedHash` rows above use a third variant:
`observableCachedFnFactory` (in `utilities/mst-utils.ts`). It packages the
same idea — a `_version` `observable.box` bumped only by `invalidate()`
plus a non-observable `_lastVersion` field that the getter writes — into a
single helper. The getter reads `_version.get()` first (establishing the
MobX dependency), compares it to `_lastVersion`, and recomputes lazily if
they differ. It's the most disciplined pattern of the three: the
observable-write happens only inside `invalidate()` (which callers must
invoke from an action), and the getter has no side effects on observables
at all. Prefer `observableCachedFnFactory` when adding a new derived value
that has its own invalidation lifecycle.

A fourth, lighter-weight variant trades the dedicated version counter for a
derived snapshot. A getter like
`attributeDescriptionsStr = JSON.stringify(this.attributeDescriptions)` on
`DataConfigurationModel` (or `caseDataHash` on the same model) exposes the
*contents* of a small observable structure as a primitive that is cheap to
compare. Reactions that observe it fire on any change — value, structure,
or otherwise — without anyone having to remember to bump a counter. Use
this when there is no dedicated version, the source is a small-ish
observable structure (a map, an array of descriptions), and the reaction
consumer wants "fire on any change to this state, regardless of how it
changed." The cost is JSON recomputation on every underlying change — fine
for small structures, not for large ones.

### `CollectionModel`

| Marker                       | Type             | Set by                                          | Cleared by                              | Read by (getter)                  |
|------------------------------|------------------|-------------------------------------------------|-----------------------------------------|-----------------------------------|
| `_groupingChangeVersion`     | `observable.box` | `completeCaseGroups` (after rebuild or append) | (counter)                               | `caseGroups`, `cases`, `nonEmptyCases`, `caseIdsHash`, `caseIdsOrderedHash` |
| `_valueChangeVersion`        | `observable.box` | `recomputeNonEmptyCases`                        | (counter)                               | `nonEmptyCases` only              |
| `_needsFullRebuild`          | plain `boolean`  | starts true; `invalidateCaseGroups` sets true  | `completeCaseGroups` (rebuild path) sets false | (private; gates rebuild path)     |
| `_pendingNewCaseIds`         | plain `string[]?`| `invalidateCaseGroupsForNewCases`               | `completeCaseGroups`                    | (private; gates append path)      |

**Why two version observables on Collection.** The split exists so that
formula recomputation touching only child-collection attributes can
update `nonEmptyCases` without invalidating `caseGroups` / `cases` /
hashes — which would force every `<table>` row, every `<graph>` axis, and
every legend to re-render needlessly. Only `nonEmptyCases` reads
`_valueChangeVersion`; the other four grouping-derived views ignore it.

**The subsumption invariant.** A grouping change *includes* a value change:
the rebuild path inside `completeCaseGroups` recomputes `_nonEmptyCases` as
part of its work. So the rebuild path bumps **only** `_groupingChangeVersion`
— it must not also bump `_valueChangeVersion`, because that would tell
`nonEmptyCases` readers there are *two* invalidations and rebreak the same
caches twice. The `recomputeNonEmptyCases` action returns early if a full
rebuild is pending (`_needsFullRebuild`), for the same reason: it would walk
caches that are about to be discarded.

### `Attribute`

`Attribute` does not participate in case validation directly — it holds
*values*, not cases. Its single mutation signal is:

| Marker          | Type              | Set by                                                                 | Read by                                                                                       |
|-----------------|-------------------|------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| `changeCount`   | volatile `number` | `incChangeCount` (called from `setValue`, `setValues`, `addValue(s)`, `removeValues`, `setComputedValues`, `orderValues`, `clearValues`) | `length` (always), `type` (when `userType` unset), CategorySet's `mstReaction`, ad-hoc consumers |

`changeCount` is the **canonical "values changed" signal**. It's bumped by
both ordinary value setters (which run as MST actions) and by
`setComputedValues` (which writes directly to the volatile `strValues` /
`numValues` arrays without an action, for formula-engine speed). Because
the value arrays themselves are volatile and not deeply observable —
`strValue(i)` and `numValue(i)` read plain JS array elements, which MobX
does not track — `changeCount` is the only correct dependency for
"react when values change."

**Action-middleware visibility.** `setComputedValues` writes directly to
the volatile arrays and does not run as an MST action. Code that uses
`onAction` / `onAnyAction` to observe value changes on a DataSet
(FilteredCases, formula observers, plugin notifications) sees only the
umbrella DataSet action — `setComputedCaseValues` or `setCaseValues` —
not the per-attribute writes inside. The umbrella action carries
`affectedAttributes` in its arguments, which is enough for most
listeners; instrumentation that needs per-attribute granularity should
read that arg list rather than expecting a per-attribute action event.

> **Methods that do *not* bump `changeCount`, by design:**
>
> - `setComputedValue` (singular). Callers batch and bump themselves;
>   `setComputedValues` is the batch wrapper that bumps once at the end.
> - `setUserType`, `setPrecision`, `setDisplayExpression`, `clearFormula`.
>   These don't change values. The next `setComputedValues` (formula
>   recompute) will bump.
> - `initializeVolatileState`. Runs only from `afterCreate` (before any
>   consumer can subscribe) and `afterApplySnapshot` (after a full MST
>   tree replacement, where higher-level invalidations fire anyway).

### `DataSetMetadata`

DataSetMetadata is plain MST: every observable property is tracked
automatically. There is no separate validation pipeline. Notable surfaces:

- `selection` (on `DataSet`, not metadata, but commonly co-observed):
  `observable.set<string>` of selected item/case ids.
- `setAsideItemIdsSet`, `filteredOutItemIds`: observable sets backing the
  hidden-cases and filter-formula state on `DataSet`.
- `collections.<id>.collapsed`: per-collection map of collapsed parent-case
  ids on `DataSetMetadata`.
- `attributes.<id>` and `provisionalCategories`: see CategorySet below.

### `FilteredCases`

A plain class (MobX decorators, not MST). It represents a per-tile,
*purpose-filtered* subset of a DataSet's cases — distinct from the raw
DataSet, which contains every case. The canonical use case is plottable
data: a graph showing weight vs. height can only plot cases that have
valid (non-empty, numeric) values for both attributes. The graph's
dataConfig constructs a `FilteredCases` whose predicate excludes cases
that don't meet that requirement, and observes `caseIds` / `caseIdSet`
to drive rendering. Tables and other clients that display the data
as-is don't need this layer and read DataSet directly.

It maintains its own cache and listens to the source DataSet via
`onAnyAction`:

| Marker                | Type                        | Bumped by                                            | Read by                |
|-----------------------|-----------------------------|------------------------------------------------------|------------------------|
| `_caseIdsVersion`     | `@observable number`        | `invalidateCases` action                             | `caseIds`, `caseIdSet` |
| `_lastValidatedVersion` | plain `number`            | the `validateCaseIds` getter, after recompute        | (private)              |

The before/after action listeners diff each value change to decide whether
the change moved a case across the filter boundary; only filter-crossing
changes call `invalidateCases`. Pure-pass-through value edits don't
invalidate the cache.

### `CategorySet`

| Marker         | Type                | Bumped by                                                                  | Read by                       |
|----------------|---------------------|----------------------------------------------------------------------------|-------------------------------|
| `_isValid`     | `observable.box`    | `invalidate` action (called from `mstReaction(() => attr.changeCount)`, also by `onPatch /moves`) | `values`, `index(value)`      |
| `observableValues` | `observable.array` | `refresh()` (replace, inside `runInAction`) when `_isValid` is false    | `values`                      |

CategorySet is the canonical example of "react to value changes via
`changeCount`": it observes the attribute's `changeCount`, invalidates
itself, and rebuilds the category list lazily on next read.

## Choosing the right observable

This is the part that usually trips people up. Here's the decision tree.

### "I need to react to **a value change**"

If you're rendering one cell, one case-card field, one summary, one
adornment label, etc., you almost always want **`attribute.changeCount`**.
Read it once at the top of the observer (the unused-expression pattern works
fine — see the example below). Don't try to depend on the value array
itself; it's not deeply observable.

```tsx
export const CaseAttrView = observer(function CaseAttrView ({ attr, ... }) {
  // Establish a MobX dependency on the attribute's mutation counter so this
  // observer re-renders when values change (e.g. slider-driven formula
  // recomputes). The data accessors below read non-observable volatile
  // arrays. (CODAP-1290)
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  attr?.changeCount
  const cellStrValue = data?.getStrValue(caseId, id)
  // ...
})
```

If you're rendering a **derived view of all values** (a sort, a category
list, a min/max), build it on top of an existing reactive surface
(`CategorySet.values`, `attribute.length`, `attribute.type`) rather than
walking the array yourself with no `changeCount` read.

### "I need to react to **case structure** changes (counts, ordering, presence)"

Use the **DataSet getters** rather than reaching into the collection:

- `data.getCasesForCollection(id)` → `readonly ICase[]`
- `data.getNonEmptyCasesForCollection(id)` → `readonly ICase[]`
- `data.getCasesForAttributes(attrIds)` → `ICase[]` — cases from the
  child-most collection containing any of the listed attributes. Walks
  child → parent and returns the first match (the most-detailed case-
  level view that includes any of those attributes). See
  [hierarchical-data.md](./hierarchical-data.md) for the rationale.
- `data.itemIds`, `data.items` → arrays of items

These call `validateCases()` first (so you get fresh data) and read both
`DataSet._caseValidationVersion` and the relevant Collection version
counters. That dual dependency is what `CollectionTitle` relies on:

```tsx
// Read through the dataset's getter methods (rather than `collection.cases`
// / `collection.nonEmptyCases` directly) so this observer establishes a
// MobX dependency on the dataset's validation observable. Without that
// dependency the title would not re-render after a value-only invalidation
// (e.g. formula recompute via setComputedCaseValues), and the displayed
// nonEmptyCases count would stay stale.
const visibleCaseCount  = showCount ? (data?.getCasesForCollection(collectionId).length ?? 0) : 0
const nonEmptyCaseCount = showCount ? (data?.getNonEmptyCasesForCollection(collectionId).length ?? 0) : 0
```

(Reading `collection.cases` directly *does* establish a dependency on
`Collection._groupingChangeVersion`, but only that — and it skips the
DataSet's `validateCases()` gating, so you can race against a pending
rebuild.)

### "I need to react to **item set or order** changes"

Read **`data.itemIdsOrderedHash`** (sensitive to order) or
**`data.itemIdsHash`** (set-only; ignores order). Both are observable
hashes recomputed lazily from the visible item IDs (after applying
set-aside and filter-formula exclusions). They're cheap to depend on —
the comparison is one number — and they update on item add, remove,
hide / unhide, filter-formula change, and reorder.

The canonical consumer is the formula machinery, which watches
`itemIdsOrderedHash` to recompute all formulas on any item-set or
ordering change (order-sensitive functions like `first`, `last`, `prev`,
`next` need it):

```ts
// formula-observers.ts:37
mstReaction(
  () => localDataSet.itemIdsOrderedHash,
  () => recalculateCallback("ALL_CASES"),
  { name: "FormulaObservers.itemsReaction" }, localDataSet
)
```

Use the unordered `itemIdsHash` if your reaction shouldn't fire on a pure
reorder (sort) — e.g. anything that aggregates without depending on
position.

### "I need to react to **selection** changes"

Three surfaces, with different granularity:

- **`data.selection.has(itemId)` / `data.isCaseSelected(caseId)`** —
  fine-grained per-item / per-case dependency. MobX `observable.set`
  tracks `.has(key)` reads per-key, so a reaction only fires when *that
  specific* item's membership flips. Use this when rendering a per-row
  selected highlight, computing a per-case state, etc. — most consumers.
- **`data.selection`** (whole set) — fires on any membership change.
  Use when you need to enumerate the selected items (computing an
  aggregate, building a selected-cases list).
- **`data.selectionChanges`** — a coarse `number` counter bumped by
  `selectAll` / `selectCases` / `setSelectedCases`. Functionally similar
  to depending on the whole `selection` set, but the dependency surface
  is one number rather than a set, which matters when the consumer
  performs an expensive side effect (re-render-everything, refresh point
  colors across the whole graph) and doesn't need to know which items
  changed. The case-card render (`case-card.tsx:82`) and the graph
  point-selection refresh (`use-plot.ts:286`) are the canonical
  consumers.

In practice: prefer `isCaseSelected(id)` for per-row rendering;
prefer `selectionChanges` when the work is a global refresh and the
intent is "react to any selection change."

### "I need to react to **hidden-attribute / hidden-case / collapsed-case** changes"

- Hidden attributes: `metadata.isHidden(attrId)`.
- Hidden (set-aside) cases: `data.setAsideItemIdsSet` (observable set).
  Note: setting items aside *also* triggers `invalidateCases(true)` and a
  full regroup, so case-structure observers will refresh. Hide/show is
  also reflected in `data.itemIds`, `data.itemIdsHash`, and
  `data.itemIdsOrderedHash` (the hashes are computed from the *visible*
  item IDs, after set-aside and filter-formula exclusions are applied),
  so a reaction watching one of those will also fire on hide/show.
- Collapsed parent cases: `metadata.isCollapsed(caseId)` /
  `metadata.collapsedCaseIdsHash`.

### "I need to react to **filter-formula** changes"

- The filter formula text: `data.filterFormula`.
- The filtered-out result: `data.filteredOutItemIds` (observable set), and
  changes here trigger a full `invalidateCases(true)`. So observers of
  case structure will refresh automatically.
- For per-tile filter (e.g. graph dataConfig): construct a `FilteredCases`
  and read its `caseIds` / `caseIdSet`.

### "I need to react to **categories**"

`metadata.getCategorySet(attrId)?.values` returns the observable category
list. The list is lazily refreshed off `attribute.changeCount`, so adding
or recomputing values is reflected.

## Action-based observability (`onAnyAction`)

Everything above is *reactivity*: subscribe to an observable, react when
it changes. There's a complementary mechanism that fires on each MST
action call, with access to the action's name and serialized arguments.
CODAP uses it where a consumer needs to see *which* action fired with
*what* arguments — granularity that pure reactivity discards.

### What it is

A convention wrapper around MST's `onAction`, defined in
`utilities/mst-utils.ts`:

```ts
export function onAnyAction(target, listener, options?) {
  return onAction(target, listener, { attachAfter: true, allActions: true, ...options })
}
```

Two flag flips matter:

- `attachAfter: true` — stock MST option. Fire *after* the action
  completes, so the listener sees post-mutation state.
- `allActions: true` — **CODAP-specific MST extension.** Stock MST's
  `onAction` only fires for top-level (outermost) actions; nested
  actions are silent. We added the `allActions` flag in our
  [`@concord-consortium/mobx-state-tree` fork](https://github.com/concord-consortium/mobx-state-tree)
  to fire the listener for nested actions too. (Submitting it back
  upstream is on the to-do list.) This is critical in CODAP because
  most user-facing changes are wrapped in
  `data.applyModelChange(() => data.setCaseValues(...))` so the history
  service can capture them: `applyModelChange` is the top-level action;
  `setCaseValues` is a nested action inside it. Without `allActions`,
  stock MST would only report the outer `applyModelChange` and the
  listener would have no idea what changed inside. With it, the
  listener sees the inner action and its arguments (`affectedAttributes`,
  the case list, etc.) — exactly what `FilteredCases` and the formula
  observers need.

### What it gives you

Per-call granularity. The serialized action call carries the action
name (`setCaseValues`, `setComputedCaseValues`, ...) and its arguments —
enough to drive change-diffing, value-change cascades, plugin
notifications, and performance traces. `FilteredCases` registers
*before* and *after* listeners and diffs filter membership across each
case-value-change action; the formula machinery uses it to identify
which cases need recomputation.

### What it doesn't give you

- **Mutations outside MST actions.** `Attribute.setComputedValues` (the
  formula-recompute fast path) writes directly to volatile arrays
  without an action wrapper. Action listeners see only the umbrella
  `setComputedCaseValues` on the DataSet, not the per-attribute writes
  inside. (See "Action-middleware visibility" in the Attribute section
  above.)
- **Undo / redo replay** — the important one. Undo/redo applies inverse
  changes through MST's patch system or through a custom undo/redo
  patcher; in either case the replay isn't (necessarily) an MST action
  dispatch, and `onAnyAction` listeners do *not* fire. Some
  CODAP-specific custom patchers happen to re-invoke the original
  model action during replay (e.g. `setCaseValuesCustomUndoRedoPatcher`
  in `data-set-undo.ts` calls `data.setCaseValues(...)` again, which
  *is* an action and *does* fire listeners), but most don't, and you
  shouldn't assume one does without checking. **If your consumer needs
  to update on undo/redo, don't rely on action listeners alone** —
  pair them with reactivity (`mstReaction` on a relevant observable),
  or with `onPatch` if you specifically want patch-level info.

### Choosing between reactivity and action listeners

| If you need... | Use... |
|---|---|
| "react when value X changes, however it changed (including undo/redo)" | reactivity — `observer()`, `mstReaction`, `autorun` |
| "see each call to a specific action with its args, for diffing or plugin notifications" | `onAnyAction` |
| "react on undo/redo regardless of replay strategy" | reactivity (or `onPatch` for patch-level info) |
| both kinds of fidelity | both, side by side |

`FilteredCases` is the canonical "use both" consumer: action listeners
diff filter membership on case-value changes (what reactivity alone
couldn't do efficiently), and the observable `_caseIdsVersion` ensures
downstream readers track the cache via reactivity for the full set of
invalidation paths.

## Worked examples

### Case-table title nonEmptyCases count (CODAP-1173)

**Symptom.** When every attribute in a collection was formula-driven, the
case-table title reported "0 nonempty cases" even after the formula
populated values.

**Why.** Two separate problems:

1. `Collection.isNonEmptyCaseGroup` walked `dataAttributesArray`, which
   excludes formula attributes. With no non-formula attributes present, the
   walk could never find a non-empty value.
2. `CollectionTitle` read `collection.cases.length` /
   `collection.nonEmptyCases.length` directly, skipping `validateCases()`
   and missing the value-only invalidation path entirely.

**Fix.** Switch `isNonEmptyCaseGroup` to `attributesArray`. Route
`CollectionTitle` reads through `data.getCasesForCollection` /
`data.getNonEmptyCasesForCollection`. Split Collection's cache version
into grouping and value observables so a value-only invalidation can wake
`nonEmptyCases` readers without invalidating every grouping-derived view.

**General lesson.** If a derived count or list seems stuck, suspect a
read that bypasses the validation gate. Prefer the DataSet getters.

### Case-card per-cell value reactivity (CODAP-1290, in flight)

**Symptom.** A formula attribute on a case card showed stale values when a
slider-driven recompute fired.

**Why.** `CaseAttrView` and `summarizedValues` read `attr.strValue(i)` /
`attr.numValue(i)`. Those accessors index into `attr.strValues` /
`attr.numValues`, which are volatile arrays — *the array reference is
observable, but reading element `[i]` is a plain JS read*. MobX recorded no
dependency, so the `observer()` wrapper never re-ran when
`setComputedValues` mutated the arrays in place.

**Fix (PR #2556, separate branch).** Touch `attr.changeCount` once in the
observer, before the cell read. `setComputedValues` already bumps
`changeCount` after writing the batch, so the dependency now fires
correctly.

**General lesson.** "Read a value off an Attribute" is a non-reactive
operation. To make it reactive, depend on `changeCount`.

### Graph dataConfig FilteredCases stale after axis-attribute undo (CODAP-1297)

**Symptom.** After replacing an axis attribute on a graph and clicking
undo, dots for cases with missing values on the restored attribute didn't
disappear — they piled up at the axis edge.

**Why.** `DataConfigurationModel.setAttribute` (an MST action) mutates
`_attributeDescriptions` *and* calls `FilteredCases.invalidateCases()` to
bump `_caseIdsVersion`. MST undo replays the patches via `applyPatch`
against `_attributeDescriptions` directly (`tree.ts:144`), bypassing the
action wrapper. The version counter wasn't bumped, so the cached `caseIds`
— computed against the *previous* attribute — stayed valid; cases that
should now be filtered out (NaN values on the restored attribute) remained
in the array and got plotted with NaN → axis-edge.

**Fix (PR #2560).** Add reactions that close the loop regardless of how
`_attributeDescriptions` changes. In `DataConfigurationModel`, generalize
the existing legend-only reaction to watch `attributeDescriptionsStr` (a
JSON-stringified snapshot) and call `invalidateCases()`. The graph
subclass overrides `attributeDescriptionsStr` to omit `y[1+]` and
`rightNumeric`, so the subclass's existing `allYAttributeDescriptions`
reaction also gets an `invalidateCases()` call.

**General lesson.** If an action both mutates state *and* invalidates a
downstream cache, add a reaction on the mutated state. The action's
explicit call still has a job (synchronous invalidation for nested-action
callers — the reaction is queued until the outer action ends) but it can
no longer be the sole guarantor of cache freshness. Undo and any other
patch-driven path will desync the action and the cache.

## Common pitfalls

1. **Reading `attribute.strValues[i]` or `numValues[i]` in an observer.**
   MobX records no dependency. Use `attr.changeCount` (or any view that
   does — `length`, `type`, CategorySet's `values`).

2. **Reading `collection.cases` / `nonEmptyCases` directly in an
   observer.** You will track Collection's grouping-version observable but
   skip the DataSet's `_caseValidationVersion`, so you race against
   `validateCases`. Use `data.getCasesForCollection(id)` /
   `data.getNonEmptyCasesForCollection(id)` instead.

3. **Returning a plain flag from a getter without reading an observable
   first.** The getter is a closure — MobX memoizes its first return
   value forever. Every flag-returning getter on DataSet
   (`needsRegrouping`, `needsValueRevalidation`, `isValidCases`,
   `isValidItemIds`) reads `_caseValidationVersion.get()` before returning.
   Follow the pattern when you add a new one.

4. **Bumping the wrong version observable on a value-only update.** If
   you bump `_groupingChangeVersion` after a child-only value change, every
   table row, every graph axis, every legend re-renders. Bump
   `_valueChangeVersion` instead — only `nonEmptyCases` reads it.

5. **Calling `setComputedValue` (singular) without `incChangeCount`.**
   Singular `setComputedValue` is a batched primitive that does not bump
   `changeCount`. Either call `setComputedValues` (plural; bumps once) or
   call `incChangeCount` yourself after the batch.

6. **Skipping `affectedAttributes` in `setCaseValues` /
   `setComputedCaseValues` when you can supply it.** With it, both methods
   decide whether grouping is affected and skip the full regroup when the
   change is child-only — a large speedup for formula-driven dot-plot
   drags, scatter-plot drags, and case-table cell edits. Without it, the
   safe thing is a full regroup. Pass an exhaustive list when you know it;
   pass `undefined` when you don't. (Non-exhaustive lists are unsafe — if
   a parent-collection attribute changes but isn't listed, grouping won't
   be refreshed.)

7. **Mutating `setAsideItemIds` outside an action.** The `onPatch` handler
   keeps a mirror set in sync and triggers `invalidateCases`; mutations
   from outside an action skip the patch and desynchronize the mirror.

8. **Relying on an action wrapper to invalidate a downstream cache when
   undo may bypass it.** If an MST action both mutates state and
   explicitly calls `invalidateCases()` (or any sibling cache-version
   bump) on a derived consumer, undo's `applyPatch` replays the state
   mutation but skips the action body — so the explicit call never fires
   and the cache silently desyncs. Pair the explicit call with a reaction
   on the mutated state so the loop closes regardless of how the mutation
   arrived. (See worked example: CODAP-1297.)

9. **Changing what `Collection.updateCaseGroups` pushes to `newCaseIds`
   without considering both consumers.** `newCaseIds` feeds two different
   downstream branches with different requirements: `completeCaseGroups`'s
   APPEND branch wants every newly-created `caseGroupMap` entry (so it can
   extend the observable arrays correctly); `getRemappedCaseIds` wants only
   brand-new group keys (preserved-id cases are not remapping candidates).
   The current code uses an `isFullRebuild` switch to satisfy both. A
   related invariant: APPEND and REBUILD must produce identical
   `_cases` / `_caseGroups` sets — properties REBUILD enforces by walking
   `self.caseIds` (e.g., excluding hidden-only groups) APPEND must enforce
   by filtering `newCaseIds`. The `collection.test.ts` test
   *"append path excludes hidden-only case groups so it matches the rebuild
   path"* pins this. Bug history: NASAEARTH-27 (preserved-id parent groups
   dropped from APPEND after delete-all + re-add).

## Reference: which methods invalidate, and how

| Method                                  | Path                              | Calls                                                  |
|-----------------------------------------|-----------------------------------|--------------------------------------------------------|
| `addCases` (append at end)              | additive append                   | `validateCasesForNewItems(newIds)` → `Collection.invalidateCaseGroupsForNewCases` |
| `addCases` (insert)                     | full regroup                      | onPatch → `invalidateCases(true)`                      |
| `removeCases` / `removeItem`            | full regroup                      | onPatch on `_itemIds` → `invalidateCases(true)`        |
| `setCaseValues(cases, attrIds?)`        | regroup if any attrId is in a parent collection (or if no attrIds supplied); else value-only | `invalidateCases(needsRegrouping)` |
| `setComputedCaseValues(cases, attrIds)` | regroup if any attrId is in a parent collection; else value-only | `invalidateCases(needsRegrouping)`                     |
| `removeAttribute`                       | full regroup                      | `invalidateCases(true)`                                |
| `moveAttributeToNewCollection`          | full regroup                      | `invalidateCases(true)`                                |
| `moveItems`                             | full regroup                      | onPatch → `invalidateCases(true)`                      |
| `hideCasesOrItems` / `showHiddenCasesAndItems` | full regroup               | onPatch on `setAsideItemIds` → `invalidateCases(true)` |
| `setFilterFormula` / `clearFilterFormula` | full regroup                    | `invalidateCases(true)`                                |
| `updateFilterFormulaResults`            | full regroup                      | `invalidateCases(true)`                                |
| `syncCollectionLinks`                   | full regroup                      | `invalidateCases(true)`                                |
| `setUserType` / `setPrecision`          | none (metadata only)              | —                                                      |
| `Attribute.setValue` / `setValues`      | none directly; value change only  | `incChangeCount` (DataSet not invalidated by attribute methods alone) |
| `Attribute.setComputedValues`           | none directly; value change only  | `incChangeCount`                                       |

## Open questions / future work

- **Broader adoption of `affectedAttributes`.** Callers that mutate child-
  collection attributes can now pass `affectedAttributes` to `setCaseValues`
  to skip the full regroup. Case-table cell edits and the dot/scatter drag
  paths supply it; other call sites still pass `undefined` and pay the
  full-regroup cost. Auditing remaining call sites is open work.
- **Per-attribute fine-grained reactivity.** `changeCount` is collection-
  wide on the attribute. A consumer rendering one cell wakes on every
  value change to that column. For very wide datasets we may eventually
  want per-cell or per-range observability — but the memory/perf cost
  of element-level observability is what motivated the current design.
- **Observer-tracking on `setAsideItemIds`.** The current `onPatch` mirror
  is fragile (pitfall #7); a cleaner approach would replace the array
  with an observable set as the source of truth.
