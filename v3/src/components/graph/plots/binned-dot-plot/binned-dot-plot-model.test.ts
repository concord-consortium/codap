import { BinnedDotPlotModel } from "./binned-dot-plot-model"

const kDefaultValueMap: Record<string, number> = { c1: 0.5, c2: 3.5 }
let mockValueMap = kDefaultValueMap

jest.mock("../../../data-display/data-display-value-utils", () => ({
  dataDisplayGetNumericValue: (_dataset: unknown, caseID: string) => mockValueMap[caseID]
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

    it("counts a value on a bin edge in the same bin it is plotted in", () => {
      // dates in seconds with 0.2 s bins, so minDate + 0.6 is on the edge of bin 3
      const minDate = Date.UTC(2024, 0, 5) / 1000
      mockValueMap = { c1: minDate, c2: minDate + 0.6, c3: minDate + 1 }
      try {
        const m = BinnedDotPlotModel.create({ _binWidth: 0.2, _binAlignment: minDate })
        const caseIDs = ["c1", "c2", "c3"]
        m.setGraphContext({
          primaryRole: "x",
          primaryAttributeID: "attr1",
          dataset: { isCaseSelected: () => false } as any,
          showMeasuresForSelection: false,
          numberOfHorizontalRegions: 1,
          getCaseDataArray: () => caseIDs.map(caseID => ({ caseID })),
          subPlotCases: () => caseIDs
        } as any)
        expect(m.binDetails().getBinForValue(minDate + 0.6)).toBe(3)
        const counts = m.countAdornmentValues({ cellKey: {} }).values.map(value => value.numerator)
        expect(counts).toEqual([1, 0, 0, 1, 0, 1])
      } finally {
        mockValueMap = kDefaultValueMap
      }
    })
  })

  describe("respondToPlotChange", () => {
    // CODAP-1281: respondToPlotChange must set the primary axis to the bin extent so that
    // bin bands render uniformly. Other code paths (addCases, useSubAxis) rely on this.
    it("sets the primary axis domain to [minBinEdge, maxBinEdge]", () => {
      // _binWidth=1, _binAlignment=0 with case values 0.5 and 3.5 yields minBinEdge=0, maxBinEdge=4
      const m = BinnedDotPlotModel.create({ _binWidth: 1, _binAlignment: 0 })
      m.setGraphContext({
        primaryRole: "x",
        primaryAttributeID: "attr1",
        dataset: {} as any,
        showMeasuresForSelection: false,
        numberOfHorizontalRegions: 1,
        getCaseDataArray: () => [{ caseID: "c1" }, { caseID: "c2" }],
        subPlotCases: () => []
      } as any)

      const setDomain = jest.fn()
      const setAllowRangeToShrink = jest.fn()
      const primaryAxis = { setDomain, setAllowRangeToShrink }
      const axisProvider = {
        getAxis: () => primaryAxis,
        getNumericAxis: () => primaryAxis,
        getAxisHelper: () => undefined,
        setAxisHelper: () => undefined
      }

      m.respondToPlotChange({
        axisProvider: axisProvider as any,
        primaryPlace: "bottom",
        secondaryPlace: "left"
      })

      expect(setAllowRangeToShrink).toHaveBeenCalledWith(true)
      expect(setDomain).toHaveBeenCalledWith(0, 4)
    })

    it("preserves saved binWidth/binAlignment when neither primaryAttrChanged nor isBinnedPlotChanged is set", () => {
      // Saved bins (binWidth=1, alignment=0) should survive an addCases-style call
      const m = BinnedDotPlotModel.create({ _binWidth: 1, _binAlignment: 0 })
      m.setGraphContext({
        primaryRole: "x",
        primaryAttributeID: "attr1",
        dataset: {} as any,
        showMeasuresForSelection: false,
        numberOfHorizontalRegions: 1,
        getCaseDataArray: () => [{ caseID: "c1" }, { caseID: "c2" }],
        subPlotCases: () => []
      } as any)

      const axisProvider = {
        getAxis: () => undefined,
        getNumericAxis: () => ({ setDomain: jest.fn(), setAllowRangeToShrink: jest.fn() }),
        getAxisHelper: () => undefined,
        setAxisHelper: () => undefined
      }

      m.respondToPlotChange({
        axisProvider: axisProvider as any,
        primaryPlace: "bottom",
        secondaryPlace: "left"
      })

      expect(m.binWidth).toBe(1)
      expect(m.binAlignment).toBe(0)
    })
  })
})
