import { BinnedDotPlotModel } from "./binned-dot-plot-model"

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
})
