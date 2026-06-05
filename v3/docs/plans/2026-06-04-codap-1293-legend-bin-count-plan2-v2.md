# CODAP-1293 Legend Bin Count — Implementation Plan (Plan 2 of 2: V2 round-trip + cleanup)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Round-trip the numeric-legend bin count through V2 documents (V2 `numberOfLegendQuantiles` ↔ V3 per-attribute `binCount`) for both graphs and maps, and remove the now-dead `numberOfLegendQuantiles` field from the V3 model.

**Architecture:** V2's `numberOfLegendQuantiles` *is* the legend bin count (read by V2's renderer; default 5; no V2 UI). V3 currently imports it into a write-only model field and ignores it. After Plan 1, the bin count lives per-attribute as `AttributeScale.binCount` and drives the color ramp. This plan rewires V2 import to set that metadata field and V2 export to derive `numberOfLegendQuantiles` from it, then deletes the dead model field. The lock feature (`legendQuantilesAreLocked` + `legendQuantiles`) is untouched.

**Tech Stack:** TypeScript, MobX-State-Tree, Jest. V2 import/export layer in `src/v2/` + `src/components/{graph,map}/v2-*`.

**Prerequisite:** Plan 1 (the V3 feature) is complete and merged — this plan builds on `getAttributeBinCount`/`setAttributeBinCount` (metadata), `legendBinCount` (data-configuration view), and the fact that `AttributeScale.binCount` drives the bin count. (Plan 1's design/implementation docs were removed once shipped; see the code and the Background section below.)

---

## Background: the V2 legend-quantile layer (read before starting)

**Model field (to be removed):** `data-configuration-model.ts` declares `numberOfLegendQuantiles: types.maybe(types.number)`, a `setNumberOfLegendQuantiles` action, and two call sites inside `setLegendQuantilesAreLocked` (sets `thresholds.length` on lock, `undefined` on unlock). The value is **never read** by V3 runtime — confirmed write-only.

**Shared helpers** (`src/v2/codap-v2-type-utils.ts`):
- `exportLegendQuantileProps(props)` → `{ numberOfLegendQuantiles, legendQuantilesAreLocked, legendQuantiles? }`, gated by `hasLegendQuantiles(props)`. Reads `props.numberOfLegendQuantiles`.
- `importLegendQuantileProps(props)` → validates then re-exports the same shape; result is spread into the DataConfiguration snapshot.
- `exportV3Properties(props, opts)` builds a `v3:` namespace and **unconditionally** spreads `exportLegendQuantileProps(props)` into it (so a graph with `axisTypes` duplicates the quantile props into `v3` even without `includeLegendQuantiles`).
- `importV3Properties(props, opts)` spreads `importLegendQuantileProps(props)` from the `v3` namespace.

**Call sites:**
- Graph export (`v2-graph-exporter.ts:321`): `...exportLegendQuantileProps(graph.dataConfiguration)` (native top-level) **and** `:338` `...exportV3Properties(graph.dataConfiguration, { axisTypes })` (the `v3` namespace path).
- Graph import (`v2-graph-importer.ts:228`): `...importLegendQuantileProps(v2Component.componentStorage)` (native) **and** `importV3Properties(v3, { axisTypes })` (the `v3` namespace). `sharedMetadata` and `_attributeDescriptions.legend?.attributeID` are in scope.
- Map export (`v2-map-exporter.ts:73`): `...exportV3Properties(dataConfiguration, { includeLegendQuantiles: true })` — **maps use the `v3` namespace only** (no native top-level legend quantiles).
- Map import (`v2-map-importer.ts:90,131`): `...importV3Properties(v3)`. `sharedMetadata` and `_attributeDescriptions.legend` in scope.

**Design decisions for this plan:**
1. **Source of the exported count:** the legend attribute's effective bin count, `dataConfiguration.legendBinCount` (already clamped to `[2, cap]`). Export it as `numberOfLegendQuantiles`.
2. **Export gating:** only emit the legend-quantile block when there is a **numeric legend** AND (`legendBinCount !== 5` OR `legendQuantilesAreLocked`). This keeps default (5, unlocked) graphs noise-free while preserving the lock round-trip and bin-count fidelity. (V2's own default is 5, so omission is lossless.)
3. **Import mapping:** set the legend attribute's `binCount` from `componentStorage.numberOfLegendQuantiles` only when it is present and `!== 5` (mirrors Plan-1 "no metadata for defaults").
4. **Lock import** (`legendQuantilesAreLocked` + `legendQuantiles`) stays in the DataConfiguration snapshot exactly as today; only `numberOfLegendQuantiles` moves out of the config and into per-attribute metadata.

Run `npm`/`jest`/`lint` from `/v3`; `git` from the repo root.

---

## Task 1: Export `binCount` as V2 `numberOfLegendQuantiles`

**Files:**
- Modify: `src/v2/codap-v2-type-utils.ts`
- Test: `src/v2/codap-v2-type-utils.test.ts` (create if absent)

Plan: introduce a model-aware exporter that derives the V2 legend-quantile storage from a dataConfiguration, replacing the field-reading `exportLegendQuantileProps`. Keep `legendQuantilesAreLocked`/`legendQuantiles` behavior identical.

- [ ] **Step 1: Write failing tests**

In `codap-v2-type-utils.test.ts`, test the new `exportLegendQuantileStorage(dataConfig)` against a minimal stub:

```ts
import { exportLegendQuantileStorage } from "./codap-v2-type-utils"

const stubConfig = (over: Partial<{
  legendType: string, legendBinCount: number, locked: boolean, quantiles: number[]
}> = {}) => ({
  attributeType: (_role: string) => over.legendType ?? "numeric",
  legendBinCount: over.legendBinCount ?? 5,
  legendQuantilesAreLocked: over.locked ?? false,
  legendQuantiles: over.quantiles ?? []
}) as any

describe("exportLegendQuantileStorage", () => {
  it("omits the block for a default (5, unlocked) numeric legend", () => {
    expect(exportLegendQuantileStorage(stubConfig())).toEqual({})
  })
  it("omits the block when there is no numeric legend", () => {
    expect(exportLegendQuantileStorage(stubConfig({ legendType: "categorical", legendBinCount: 8 }))).toEqual({})
  })
  it("exports a non-default bin count as numberOfLegendQuantiles", () => {
    expect(exportLegendQuantileStorage(stubConfig({ legendBinCount: 8 })))
      .toEqual({ numberOfLegendQuantiles: 8, legendQuantilesAreLocked: false })
  })
  it("exports locked quantiles with the frozen thresholds", () => {
    expect(exportLegendQuantileStorage(stubConfig({ locked: true, quantiles: [2, 4] })))
      .toEqual({ numberOfLegendQuantiles: 5, legendQuantilesAreLocked: true, legendQuantiles: [2, 4] })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- codap-v2-type-utils`
Expected: FAIL — `exportLegendQuantileStorage` is not exported.

- [ ] **Step 3: Implement `exportLegendQuantileStorage`**

Add to `codap-v2-type-utils.ts`. Type the param loosely (it receives a DataConfiguration; a structural interface avoids a circular import on the model):

```ts
interface ILegendQuantileSource {
  attributeType(role: string): string | undefined
  legendBinCount: number
  legendQuantilesAreLocked?: boolean
  legendQuantiles: number[]
}

// Derives the V2 legend-quantile storage from a data configuration. The bin count is sourced from
// the per-attribute binCount (via legendBinCount). Emitted only for a numeric legend whose count
// differs from V2's default of 5, or when the quantiles are locked (V2 needs the frozen thresholds).
export function exportLegendQuantileStorage(dataConfig: ILegendQuantileSource) {
  const isNumericLegend = dataConfig.attributeType("legend") === "numeric"
  const locked = dataConfig.legendQuantilesAreLocked ?? false
  const count = dataConfig.legendBinCount
  if (!isNumericLegend || (count === 5 && !locked)) return {}
  return {
    numberOfLegendQuantiles: count,
    legendQuantilesAreLocked: locked,
    ...(locked ? { legendQuantiles: [...dataConfig.legendQuantiles] } : {})
  }
}
```

- [ ] **Step 4: Route both export paths through it**

In `codap-v2-type-utils.ts` `exportV3Properties`, replace the `...exportLegendQuantileProps(props)` line with `...exportLegendQuantileStorage(props)` and update `_hasLegendQuantiles`/`hasLegendQuantiles(props)` to gate on the new function's output being non-empty (compute `const legendStorage = exportLegendQuantileStorage(props)` once; use `Object.keys(legendStorage).length > 0`). In `v2-graph-exporter.ts:321`, replace `...exportLegendQuantileProps(graph.dataConfiguration)` with `...exportLegendQuantileStorage(graph.dataConfiguration)`.

- [ ] **Step 5: Run tests + tsc**

Run: `npm test -- codap-v2-type-utils && npm run build:tsc`
Expected: PASS / clean. (The old `exportLegendQuantileProps` may now be unused; leave it until Task 3 removes it to keep this step focused.)

- [ ] **Step 6: Commit**

```bash
cd /Users/kswenson/Development/cc-dev/codap
git add v3/src/v2/codap-v2-type-utils.ts v3/src/v2/codap-v2-type-utils.test.ts \
        v3/src/components/graph/v2-graph-exporter.ts
git commit -m "CODAP-1293: export legend bin count as V2 numberOfLegendQuantiles"
```

---

## Task 2: Import V2 `numberOfLegendQuantiles` → legend attr `binCount`

**Files:**
- Modify: `src/v2/codap-v2-type-utils.ts`
- Modify: `src/components/graph/v2-graph-importer.ts`
- Modify: `src/components/map/v2-map-importer.ts`
- Test: `src/v2/codap-v2-type-utils.test.ts`

Plan: the count no longer belongs in the DataConfiguration snapshot — it goes to per-attribute metadata. Split the import: (a) the config snapshot keeps only `legendQuantilesAreLocked`/`legendQuantiles`; (b) a new helper applies the count to `sharedMetadata` for the legend attribute.

- [ ] **Step 1: Write failing tests**

```ts
import { importLegendLockProps, applyImportedLegendBinCount } from "./codap-v2-type-utils"

describe("importLegendLockProps", () => {
  it("keeps only lock props for the config snapshot (no numberOfLegendQuantiles)", () => {
    expect(importLegendLockProps({ numberOfLegendQuantiles: 8, legendQuantilesAreLocked: true, legendQuantiles: [2,4] }))
      .toEqual({ legendQuantilesAreLocked: true, legendQuantiles: [2, 4] })
  })
  it("returns empty when nothing is locked", () => {
    expect(importLegendLockProps({ numberOfLegendQuantiles: 5 })).toEqual({})
  })
})

describe("applyImportedLegendBinCount", () => {
  it("sets binCount on the legend attribute for a non-default count", () => {
    const setAttributeBinCount = jest.fn()
    applyImportedLegendBinCount({ numberOfLegendQuantiles: 8 }, "legId", { setAttributeBinCount } as any)
    expect(setAttributeBinCount).toHaveBeenCalledWith("legId", 8)
  })
  it("does nothing for the default count of 5", () => {
    const setAttributeBinCount = jest.fn()
    applyImportedLegendBinCount({ numberOfLegendQuantiles: 5 }, "legId", { setAttributeBinCount } as any)
    expect(setAttributeBinCount).not.toHaveBeenCalled()
  })
  it("does nothing without a legend attribute id", () => {
    const setAttributeBinCount = jest.fn()
    applyImportedLegendBinCount({ numberOfLegendQuantiles: 8 }, undefined, { setAttributeBinCount } as any)
    expect(setAttributeBinCount).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- codap-v2-type-utils`
Expected: FAIL — the two functions are not exported.

- [ ] **Step 3: Implement the import helpers**

In `codap-v2-type-utils.ts`:

```ts
// Lock props for the DataConfiguration snapshot. The bin count is handled separately
// (applyImportedLegendBinCount) because it lives in per-attribute metadata, not the config.
export function importLegendLockProps(props?: IImportLegendQuantileProps) {
  if (!props?.legendQuantilesAreLocked) return {}
  const validQuantiles = props.legendQuantiles?.length &&
    props.legendQuantiles.every((q: number | null) => q != null)
  return {
    legendQuantilesAreLocked: true,
    ...(validQuantiles ? { legendQuantiles: props.legendQuantiles as number[] } : {})
  }
}

interface ILegendBinCountTarget {
  setAttributeBinCount(attrId: string, value?: number): void
}
// Maps V2's numberOfLegendQuantiles onto the legend attribute's per-attribute bin count, skipping
// the default of 5 (so common V2 docs create no metadata).
export function applyImportedLegendBinCount(
  props: IImportLegendQuantileProps | undefined, legendAttrId: string | undefined, metadata?: ILegendBinCountTarget
) {
  const count = props?.numberOfLegendQuantiles
  if (!metadata || !legendAttrId || count == null || count === 5) return
  metadata.setAttributeBinCount(legendAttrId, count)
}
```

Update `importV3Properties` to use `importLegendLockProps` instead of `importLegendQuantileProps` for the config-bound result (it must no longer emit `numberOfLegendQuantiles`).

- [ ] **Step 4: Wire the graph importer**

In `v2-graph-importer.ts`: replace `...importLegendQuantileProps(v2Component.componentStorage)` (in the config snapshot, ~line 228) with `...importLegendLockProps(v2Component.componentStorage)`. After the tile/metadata are available (where `sharedMetadata` and the legend attribute id `_attributeDescriptions.legend?.attributeID` are in scope), call:

```ts
applyImportedLegendBinCount(v2Component.componentStorage, _attributeDescriptions.legend?.attributeID, sharedMetadata)
// Also handle the v3-namespace count if present:
applyImportedLegendBinCount(v3, _attributeDescriptions.legend?.attributeID, sharedMetadata)
```

(Import the two new helpers; drop the `importLegendQuantileProps` import if now unused.)

- [ ] **Step 5: Wire the map importer**

In `v2-map-importer.ts`, after each layer's config is built (the `v3` namespace is the only source for maps), call `applyImportedLegendBinCount(v3, _attributeDescriptions.legend?.attributeID, sharedMetadata)` for that layer. `importV3Properties(v3)` (updated in Step 3) now emits only the lock props into the config.

- [ ] **Step 6: Run tests + tsc + lint**

Run: `npm test -- codap-v2-type-utils && npm run build:tsc && npm run lint`
Expected: PASS / clean.

- [ ] **Step 7: Commit**

```bash
cd /Users/kswenson/Development/cc-dev/codap
git add v3/src/v2/codap-v2-type-utils.ts v3/src/v2/codap-v2-type-utils.test.ts \
        v3/src/components/graph/v2-graph-importer.ts v3/src/components/map/v2-map-importer.ts
git commit -m "CODAP-1293: import V2 numberOfLegendQuantiles as per-attribute binCount"
```

---

## Task 3: Remove the dead `numberOfLegendQuantiles` model field

**Files:**
- Modify: `src/components/data-display/models/data-configuration-model.ts`
- Modify: `src/v2/codap-v2-type-utils.ts` (remove now-unused `exportLegendQuantileProps`/`importLegendQuantileProps` + interface field)
- Modify: `src/v2/codap-v2-types.ts` (the `numberOfLegendQuantiles` type stays — it is the V2 wire format; do NOT remove it there)
- Test: `src/components/data-display/models/.../*lock*` tests (existing lock tests must stay green)

- [ ] **Step 1: Confirm no remaining readers**

Run: `grep -rn "numberOfLegendQuantiles" src --include=*.ts --include=*.tsx | grep -v ".test."`
Expected: only `src/v2/codap-v2-types.ts` (V2 wire type) and the model declaration/setter/lock sites in `data-configuration-model.ts`. If anything else reads it, stop and reassess.

- [ ] **Step 2: Remove from the model**

In `data-configuration-model.ts`:
- Delete the prop `numberOfLegendQuantiles: types.maybe(types.number),`.
- Delete the `setNumberOfLegendQuantiles(numQuantiles) { ... }` action.
- In `setLegendQuantilesAreLocked`, delete the two lines `this.setNumberOfLegendQuantiles(thresholds.length)` (lock branch) and `this.setNumberOfLegendQuantiles(undefined)` (unlock branch). The lock still stores `legendQuantiles` + caches `_legendNumericColorScale`; the count is no longer tracked here.

- [ ] **Step 3: Remove the now-unused shared helpers**

In `codap-v2-type-utils.ts`, delete `exportLegendQuantileProps`, `importLegendQuantileProps`, `validateImportLegendQuantileProps`, and the `numberOfLegendQuantiles` field from `IBaseLegendQuantileProps` if no longer referenced (keep `IImportLegendQuantileProps.numberOfLegendQuantiles` if `applyImportedLegendBinCount` reads it — it does, so keep the import-side interface field). Run the grep from Step 1 again to confirm nothing else references the deleted helpers.

- [ ] **Step 4: Run the lock tests + V2 utils tests**

Run: `npm test -- data-configuration legend-color-controls codap-v2-type-utils`
Expected: PASS. The lock feature behaves identically (locked legends still freeze and serialize via `legendQuantiles`).

- [ ] **Step 5: tsc + lint**

Run: `npm run build:tsc && npm run lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
cd /Users/kswenson/Development/cc-dev/codap
git add v3/src/components/data-display/models/data-configuration-model.ts v3/src/v2/codap-v2-type-utils.ts
git commit -m "CODAP-1293: remove dead numberOfLegendQuantiles model field"
```

---

## Task 4: V2 round-trip integration test + verification

**Files:**
- Test: extend the existing graph and map V2 import/export tests (find with `grep -rl "v2GraphExporter\|v2GraphImporter\|exportV2" src/components/graph/__tests__ src/components/graph`).

- [ ] **Step 1: Write a graph round-trip test**

Add a test that: builds a graph with a numeric legend, sets `binCount` to 8 on the legend attribute, exports to V2, and asserts `componentStorage.numberOfLegendQuantiles === 8`. Then re-imports that storage and asserts the legend attribute's `binCount` is 8 again. (Model the setup on the existing graph exporter/importer tests in the repo.)

```ts
// Pseudocode shape — adapt to the existing test harness/builders:
// 1. create dataset + numeric legend attribute, metadata.setAttributeBinCount(legId, 8)
// 2. const storage = v2GraphExporter(...).componentStorage
//    expect(storage.numberOfLegendQuantiles).toBe(8)
// 3. import storage via v2GraphImporter(...), then
//    expect(importedMetadata.getAttributeBinCount(legId)).toBe(8)
```

- [ ] **Step 2: Write a map round-trip test**

Same as Step 1 but for the map (the count lives under `componentStorage.<layer>.v3.numberOfLegendQuantiles`). Assert export writes it under the `v3` namespace and import restores `binCount`.

- [ ] **Step 3: Write a default round-trip test**

A numeric legend with the default bin count (no `binCount` override) exports **no** `numberOfLegendQuantiles` (Task 1 gating) and imports back to `binCount === undefined` (effective 5).

- [ ] **Step 4: Run tests to verify they fail, then pass**

Run the new tests; expect them to drive out any wiring gaps from Tasks 1–2. Fix wiring (not the tests) until green.

- [ ] **Step 5: Full verification**

Run:
```bash
npm run build:tsc
npm run lint
npm test -- codap-v2-type-utils v2-graph v2-map data-configuration legend-color-controls choropleth-legend
```
Expected: all clean / green.

- [ ] **Step 6: Manual QA**

Export a V3 document with a non-default legend bin count to V2 (`.codap`), reopen in V3 → the bin count survives. If a V2 build is handy, open the exported file in V2 and confirm the legend renders with that many bins.

- [ ] **Step 7: Commit + push**

```bash
cd /Users/kswenson/Development/cc-dev/codap
git add -A
git commit -m "CODAP-1293: test V2 round-trip of legend bin count"
git push -u origin CODAP-1293-legend-bin-count
```

---

## Risks / notes for the implementer

- **Dual export path (graph):** a graph with `axisTypes` embeds the legend block into both the native top-level and the `v3` namespace. After Task 1 both route through `exportLegendQuantileStorage`, so they stay consistent, but the round-trip test (Task 4 Step 1) should assert the **top-level** value specifically and tolerate the `v3` duplicate.
- **Import precedence (graph):** the graph imports the count from both native (`componentStorage.numberOfLegendQuantiles`) and `v3` (`v3.numberOfLegendQuantiles`). `applyImportedLegendBinCount` is idempotent for equal values; if they ever disagree, the later call wins. Native V2 docs only have the top-level value; V3-exported docs have both with the same value.
- **`legendQuantiles` interplay:** the lock path is unchanged. `binCount` and the frozen `legendQuantiles` are independent; do not let the count removal touch the lock serialization.
- **Do not remove `numberOfLegendQuantiles` from `codap-v2-types.ts`** — that is the V2 file format and must stay for import parsing.
