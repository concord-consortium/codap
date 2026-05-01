import { BinnedDotPlotModel } from "./binned-dot-plot-model"

jest.mock("../../../data-display/data-display-value-utils", () => ({
  dataDisplayGetNumericValue: (_dataset: unknown, caseID: string) => {
    const valueMap: Record<string, number> = { c1: 0.5, c2: 3.5 }
    return valueMap[caseID]
  }
}))

describe("BinnedDotPlotModel", () => {
  it("binDetailsFromValues returns correct bin details", () => {
    const m = BinnedDotPlotModel.create()
    // cf. https://concord-consortium.atlassian.net/browse/CODAP-992
    expect(m.binDetailsFromValues(2.5, 4)).toEqual({
      binAlignment: 2.4,
      binWidth: 0.2,
      binWidthPrecision: 1,
      binAlignmentPrecision: 1,
      binEdgePrecision: 1,
      binValuePrecision: 3,
      minBinEdge: 2.4,
      maxBinEdge: 4.2,
      minValue: 2.5,
      maxValue: 4,
      totalNumberOfBins: 9
    })
  })

  describe("countAdornmentValues", () => {
    // _binWidth=1, _binAlignment=0 with case values 0.5 and 3.5 yields totalNumberOfBins=4
    // (minBinEdge=0, maxBinEdge=4)
    function makeFixtureModel(primaryRole: "x" | "y", numberOfHorizontalRegions = 2) {
      const m = BinnedDotPlotModel.create({ _binWidth: 1, _binAlignment: 0 })
      const dataConfig = {
        primaryRole,
        primaryAttributeID: "attr1",
        dataset: {} as any,
        showMeasuresForSelection: false,
        numberOfHorizontalRegions,
        getCaseDataArray: () => [{ caseID: "c1" }, { caseID: "c2" }],
        subPlotCases: () => []
      }
      m.setGraphContext(dataConfig as any)
      return m
    }

    it("emits startFraction/endFraction on every bin", () => {
      const m = makeFixtureModel("x")
      const result = m.countAdornmentValues({ cellKey: {} })
      expect(result.values).toHaveLength(4)
      result.values.forEach((value, i) => {
        expect(value.startFraction).toBeCloseTo(i / 4)
        expect(value.endFraction).toBeCloseTo((i + 1) / 4)
      })
    })

    it("multiplies numHorizontalRegions by totalNumberOfBins for x-primary", () => {
      const m = makeFixtureModel("x", 2)
      const result = m.countAdornmentValues({ cellKey: {} })
      expect(result.numHorizontalRegions).toBe(8) // 2 horizontal regions * 4 bins
    })

    it("does not multiply numHorizontalRegions by totalNumberOfBins for y-primary", () => {
      const m = makeFixtureModel("y", 2)
      const result = m.countAdornmentValues({ cellKey: {} })
      expect(result.numHorizontalRegions).toBe(2) // 2 horizontal regions, bins stack vertically
    })

    it("treats undefined primaryRole as x to match the component's default", () => {
      const m = BinnedDotPlotModel.create({ _binWidth: 1, _binAlignment: 0 })
      m.setGraphContext({
        primaryRole: undefined,
        primaryAttributeID: "attr1",
        dataset: {} as any,
        showMeasuresForSelection: false,
        numberOfHorizontalRegions: 2,
        getCaseDataArray: () => [{ caseID: "c1" }, { caseID: "c2" }],
        subPlotCases: () => []
      } as any)
      const result = m.countAdornmentValues({ cellKey: {} })
      expect(result.numHorizontalRegions).toBe(8) // 2 horizontal regions * 4 bins (x-primary default)
    })
  })
})
