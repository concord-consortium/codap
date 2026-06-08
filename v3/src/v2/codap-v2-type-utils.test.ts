import {
  applyImportedLegendBinCount, exportLegendQuantileStorage, importLegendLockProps
} from "./codap-v2-type-utils"

const stubConfig = (over: Partial<{
  legendType: string, legendBinCount: number, locked: boolean, quantiles: number[]
}> = {}) => ({
  attributeType: (_role: string) => over.legendType ?? "numeric",
  legendBinCount: over.legendBinCount ?? 5,
  legendQuantilesAreLocked: over.locked ?? false,
  legendQuantiles: over.quantiles ?? []
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
  it("exports locked quantiles with the frozen thresholds", () => {
    expect(exportLegendQuantileStorage(stubConfig({ locked: true, quantiles: [2, 4] })))
      .toEqual({ numberOfLegendQuantiles: 5, legendQuantilesAreLocked: true, legendQuantiles: [2, 4] })
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
  it("emits a non-default numeric bin count", () => {
    expect(exportLegendQuantileStorage(stubConfig({ legendBinCount: 8 }), { v2Native: true }))
      .toEqual({ numberOfLegendQuantiles: 8, legendQuantilesAreLocked: false })
  })
  it("emits locked quantiles", () => {
    expect(exportLegendQuantileStorage(stubConfig({ locked: true, quantiles: [2, 4] }), { v2Native: true }))
      .toEqual({ numberOfLegendQuantiles: 5, legendQuantilesAreLocked: true, legendQuantiles: [2, 4] })
  })
})

describe("importLegendLockProps", () => {
  it("keeps only lock props for the config snapshot (no numberOfLegendQuantiles)", () => {
    const props = { numberOfLegendQuantiles: 8, legendQuantilesAreLocked: true, legendQuantiles: [2, 4] }
    expect(importLegendLockProps(props)).toEqual({ legendQuantilesAreLocked: true, legendQuantiles: [2, 4] })
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
