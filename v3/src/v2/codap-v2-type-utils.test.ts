import { types } from "mobx-state-tree"
import { GraphDataConfigurationModel } from "../components/graph/models/graph-data-configuration-model"
import { DataSet, toCanonical } from "../models/data/data-set"
import { DataSetMetadata } from "../models/shared/data-set-metadata"
import {
  applyImportedLegendBinCount, exportLegendQuantileStorage, exportV3Properties, importLegendLockProps,
  importV3Properties, padV2LegendMax, unpadV2LegendMax
} from "./codap-v2-type-utils"

const stubConfig = (over: Partial<{
  legendType: string, legendBinCount: number, locked: boolean, quantiles: number[],
  lockedMin: number, lockedMax: number, liveRange: { min?: number, max?: number }
}> = {}) => ({
  attributeType: (_role: string) => over.legendType ?? "numeric",
  displayedLegendBinCount: over.legendBinCount ?? 5,
  legendQuantilesAreLocked: over.locked ?? false,
  legendQuantiles: over.quantiles ?? [],
  legendLockedMin: over.lockedMin,
  legendLockedMax: over.lockedMax,
  liveLegendDisplayRange: over.liveRange ?? {}
}) as any

describe("exportLegendQuantileStorage (v3 extension namespace / maps)", () => {
  it("omits the block for a default (5, unlocked) numeric legend", () => {
    expect(exportLegendQuantileStorage(stubConfig())).toEqual({})
  })
  it("omits the block when there is no numeric legend", () => {
    expect(exportLegendQuantileStorage(stubConfig({ legendType: "categorical", legendBinCount: 8 }))).toEqual({})
  })
  it("omits the block when passed something that is not a data configuration", () => {
    // The data-interactive data-context export path passes a bare DataSet (no attributeType /
    // legendBinCount); the exporter must tolerate it and emit nothing.
    expect(exportLegendQuantileStorage({} as any)).toEqual({})
    expect(exportLegendQuantileStorage({ filterFormula: { display: "x>1" } } as any)).toEqual({})
  })
  it("exports a non-default bin count as numberOfLegendQuantiles", () => {
    expect(exportLegendQuantileStorage(stubConfig({ legendBinCount: 8 })))
      .toEqual({ numberOfLegendQuantiles: 8, legendQuantilesAreLocked: false })
  })
  it("exports locked edges as [min, ...inner edges, padded max]", () => {
    const config = stubConfig({ legendBinCount: 3, locked: true, quantiles: [2, 4], lockedMin: 0, lockedMax: 10 })
    expect(exportLegendQuantileStorage(config)).toEqual({
      numberOfLegendQuantiles: 3, legendQuantilesAreLocked: true, legendQuantiles: [0, 2, 4, padV2LegendMax(0, 10)]
    })
  })
})

describe("exportLegendQuantileStorage (native V2 graph storage)", () => {
  it("always emits the block for a default numeric legend (matching V2)", () => {
    expect(exportLegendQuantileStorage(stubConfig(), { v2Native: true }))
      .toEqual({ numberOfLegendQuantiles: 5, legendQuantilesAreLocked: false })
  })
  it("falls back to 5 for a non-numeric legend (legendBinCount collapses to 1)", () => {
    const config = stubConfig({ legendType: "categorical", legendBinCount: 1 })
    expect(exportLegendQuantileStorage(config, { v2Native: true }))
      .toEqual({ numberOfLegendQuantiles: 5, legendQuantilesAreLocked: false })
  })
  it("emits a date legend's bin count, as V2 does for dates", () => {
    expect(exportLegendQuantileStorage(stubConfig({ legendType: "date", legendBinCount: 3 }), { v2Native: true }))
      .toEqual({ numberOfLegendQuantiles: 3, legendQuantilesAreLocked: false })
  })
  it("emits a locked date legend's bin count, matching its exported edges", () => {
    const config = stubConfig({
      legendType: "date", legendBinCount: 3, locked: true, quantiles: [2, 4], lockedMin: 0, lockedMax: 10
    })
    const storage = exportLegendQuantileStorage(config, { v2Native: true })
    expect(storage.numberOfLegendQuantiles).toBe(3)
    expect(storage.legendQuantiles).toHaveLength(4)
  })
  it("emits a non-default numeric bin count", () => {
    expect(exportLegendQuantileStorage(stubConfig({ legendBinCount: 8 }), { v2Native: true }))
      .toEqual({ numberOfLegendQuantiles: 8, legendQuantilesAreLocked: false })
  })
  it("emits locked edges as [min, ...inner edges, padded max]", () => {
    const config = stubConfig({ legendBinCount: 3, locked: true, quantiles: [2, 4], lockedMin: 0, lockedMax: 10 })
    expect(exportLegendQuantileStorage(config, { v2Native: true })).toEqual({
      numberOfLegendQuantiles: 3, legendQuantilesAreLocked: true, legendQuantiles: [0, 2, 4, padV2LegendMax(0, 10)]
    })
  })
  it("pads the max by V2's formula", () => {
    // V2: max + |max - min| * 0.000001
    expect(padV2LegendMax(0, 10)).toBe(10.00001)
    expect(padV2LegendMax(5, 5)).toBe(5)
  })
  it("uses the live range for an older locked document with no saved min and max", () => {
    const config = stubConfig({ legendBinCount: 3, locked: true, quantiles: [2, 4], liveRange: { min: 1, max: 9 } })
    expect(exportLegendQuantileStorage(config, { v2Native: true }).legendQuantiles)
      .toEqual([1, 2, 4, padV2LegendMax(1, 9)])
  })
  it("widens an older document's live range to include the saved edges, keeping the values in order", () => {
    // the data changed after locking, so the live range 15..25 no longer includes the edges 10..40
    const config = stubConfig({
      legendBinCount: 5, locked: true, quantiles: [10, 20, 30, 40], liveRange: { min: 15, max: 25 }
    })
    expect(exportLegendQuantileStorage(config, { v2Native: true }).legendQuantiles)
      .toEqual([10, 10, 20, 30, 40, padV2LegendMax(10, 40)])
  })
  it("exports only the inner edges when there is no range at all", () => {
    const config = stubConfig({ legendBinCount: 3, locked: true, quantiles: [2, 4] })
    expect(exportLegendQuantileStorage(config, { v2Native: true }).legendQuantiles).toEqual([2, 4])
  })
})

describe("importLegendLockProps", () => {
  it("keeps only lock props for the config snapshot (no numberOfLegendQuantiles)", () => {
    const props = { numberOfLegendQuantiles: 2, legendQuantilesAreLocked: true, legendQuantiles: [0, 2, 4] }
    expect(Object.keys(importLegendLockProps(props)))
      .toEqual(["legendQuantilesAreLocked", "legendQuantiles", "legendLockedMin", "legendLockedMax"])
  })
  it("splits V2's N+1 edges into min, inner edges, and max, and removes the padding from max", () => {
    const props = { legendQuantilesAreLocked: true, legendQuantiles: [0, 2, 4, 6, 8, padV2LegendMax(0, 10)] }
    const result = importLegendLockProps(props)
    expect(result.legendQuantiles).toEqual([2, 4, 6, 8])
    expect(result.legendLockedMin).toBe(0)
    expect(result.legendLockedMax).toBe(10)
  })
  it("imports a one-bin V2 legend (2 edges) as no inner edges", () => {
    const result = importLegendLockProps({ legendQuantilesAreLocked: true, legendQuantiles: [5, 5] })
    expect(result).toEqual({
      legendQuantilesAreLocked: true, legendQuantiles: [], legendLockedMin: 5, legendLockedMax: 5
    })
  })
  it("splits V2's edges when the bin count does not match them", () => {
    // V2 keeps the locked edges when the bin count changes, so the count can differ
    const props = {
      numberOfLegendQuantiles: 3, legendQuantilesAreLocked: true, legendQuantiles: [0, 2, 4, 6, padV2LegendMax(0, 8)]
    }
    expect(importLegendLockProps(props)).toEqual({
      legendQuantilesAreLocked: true, legendQuantiles: [2, 4, 6], legendLockedMin: 0, legendLockedMax: 8
    })
  })
  it("keeps an older V3 export's N-1 inner edges as they are", () => {
    const props = { numberOfLegendQuantiles: 5, legendQuantilesAreLocked: true, legendQuantiles: [20, 40, 60, 80] }
    expect(importLegendLockProps(props)).toEqual({ legendQuantilesAreLocked: true, legendQuantiles: [20, 40, 60, 80] })
  })
  it("keeps an older V3 map's N-1 inner edges from the v3: extension as they are", () => {
    const v3 = { numberOfLegendQuantiles: 5, legendQuantilesAreLocked: true, legendQuantiles: [20, 40, 60, 80] }
    expect(importV3Properties(v3)).toEqual({ legendQuantilesAreLocked: true, legendQuantiles: [20, 40, 60, 80] })
  })
  it("returns empty when nothing is locked", () => {
    expect(importLegendLockProps({ numberOfLegendQuantiles: 5 })).toEqual({})
  })
  it("omits invalid (null-containing) quantiles while keeping the lock flag", () => {
    expect(importLegendLockProps({ legendQuantilesAreLocked: true, legendQuantiles: [2, null] as any }))
      .toEqual({ legendQuantilesAreLocked: true })
  })
})

describe("applyImportedLegendBinCount", () => {
  it("sets binCount on the legend attribute for a non-default count", () => {
    const setAttributeBinCount = jest.fn()
    applyImportedLegendBinCount({ numberOfLegendQuantiles: 8 }, "legId", { setAttributeBinCount })
    expect(setAttributeBinCount).toHaveBeenCalledWith("legId", 8)
  })
  it("does nothing for the default count of 5", () => {
    const setAttributeBinCount = jest.fn()
    applyImportedLegendBinCount({ numberOfLegendQuantiles: 5 }, "legId", { setAttributeBinCount })
    expect(setAttributeBinCount).not.toHaveBeenCalled()
  })
  it("does nothing without a legend attribute id", () => {
    const setAttributeBinCount = jest.fn()
    applyImportedLegendBinCount({ numberOfLegendQuantiles: 8 }, undefined, { setAttributeBinCount })
    expect(setAttributeBinCount).not.toHaveBeenCalled()
  })
  it("does nothing without metadata", () => {
    expect(() => applyImportedLegendBinCount({ numberOfLegendQuantiles: 8 }, "legId", undefined)).not.toThrow()
  })
})

describe("locked legend round trips", () => {
  // A V3 config (as a stub) holding what importLegendLockProps produced
  const configFromImport = (imported: ReturnType<typeof importLegendLockProps>) => stubConfig({
    legendBinCount: (imported.legendQuantiles?.length ?? 0) + 1,
    locked: true,
    quantiles: imported.legendQuantiles,
    lockedMin: imported.legendLockedMin,
    lockedMax: imported.legendLockedMax
  })
  const roundTrip = (v2Edges: number[]) => {
    const imported = importLegendLockProps({ legendQuantilesAreLocked: true, legendQuantiles: v2Edges })
    return exportLegendQuantileStorage(configFromImport(imported), { v2Native: true }).legendQuantiles!
  }

  it("keeps the same edges in a V2 -> V3 -> V2 round trip", () => {
    const v2Edges = [3.2, 10.5, 47.25, 61, 88.8, padV2LegendMax(3.2, 1024.75)]
    // unpadV2LegendMax gives back the exact max, so the padded max is the same value too
    expect(roundTrip(v2Edges)).toEqual(v2Edges)
  })

  it("does not make max grow over many round trips", () => {
    const v2Edges = [0, 25, 50, 75, padV2LegendMax(0, 100)]
    let edges = v2Edges
    for (let i = 0; i < 10; i++) edges = roundTrip(edges)
    expect(edges).toEqual(v2Edges)
    const imported = importLegendLockProps({ legendQuantilesAreLocked: true, legendQuantiles: edges })
    expect(imported.legendLockedMax).toBe(100)
  })

  it("removes the padding from a negative range", () => {
    expect(unpadV2LegendMax(-50, padV2LegendMax(-50, -10))).toBe(-10)
  })

  it("gives back exactly the max where plain arithmetic would land just below it", () => {
    // (paddedMax + min * f) / (1 + f) gives -99.00000000000001 here, which would make -99 "missing"
    expect(unpadV2LegendMax(-100, padV2LegendMax(-100, -99))).toBe(-99)
    expect(unpadV2LegendMax(0, padV2LegendMax(0, 100))).toBe(100)
    expect(unpadV2LegendMax(5, padV2LegendMax(5, 5))).toBe(5)
  })

  it("never gives a max below the true max", () => {
    // a fixed set of ranges across many sizes, so the test is repeatable
    let below = 0
    for (let exp = -6; exp <= 9; exp++) {
      for (let i = 1; i <= 200; i++) {
        const min = ((i * 7919) % 1000 - 500) * Math.pow(10, exp) / 97
        const max = min + ((i * 104729) % 1000 + 1) * Math.pow(10, exp) / 89
        if (unpadV2LegendMax(min, padV2LegendMax(min, max)) < max) below++
      }
    }
    expect(below).toBe(0)
  })

  it("imports and exports the same way through the v3: extension (maps)", () => {
    const config = stubConfig({ legendBinCount: 3, locked: true, quantiles: [2, 4], lockedMin: 0, lockedMax: 10 })
    const { v3 } = exportV3Properties(config, { includeLegendQuantiles: true }) as { v3: any }
    expect(v3.legendQuantiles).toEqual([0, 2, 4, padV2LegendMax(0, 10)])
    expect(v3.numberOfLegendQuantiles).toBe(3)
    const imported = importV3Properties(v3) as ReturnType<typeof importLegendLockProps>
    expect(imported.legendQuantiles).toEqual([2, 4])
    expect(imported.legendLockedMin).toBe(0)
    expect(imported.legendLockedMax).toBe(10)
  })
})

describe("exporting a locked legend from a real data configuration", () => {
  const TreeModel = types.model("Tree", {
    data: DataSet,
    metadata: DataSetMetadata,
    config: GraphDataConfigurationModel
  })

  it("keeps the locked bin count after hiding cases lowers the live bin count", () => {
    const t = TreeModel.create({ data: {}, metadata: {}, config: {} })
    t.data.addAttribute({ id: "legId", name: "leg" })
    t.metadata.setData(t.data)
    t.data.addCases(toCanonical(t.data, Array.from({ length: 11 }, (_, i) => ({ __id__: `c${i}`, leg: i * 10 }))))
    t.config.setDataset(t.data, t.metadata)
    t.config.setAttribute("legend", { attributeID: "legId" })
    t.config.setLegendQuantilesAreLocked(true)

    // leave only 3 distinct values visible
    t.config.setHiddenCases(["c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10"]
      .map(id => t.data.getItemChildCaseId(id)!))
    expect(t.config.legendBinCount).toBe(3)

    const storage = exportLegendQuantileStorage(t.config, { v2Native: true })
    expect(storage.numberOfLegendQuantiles).toBe(5)
    expect(storage.legendQuantiles).toHaveLength(6)
    expect(storage.legendQuantiles?.[0]).toBe(0)
    expect(storage.legendQuantiles?.[5]).toBe(padV2LegendMax(0, 100))
  })
})
