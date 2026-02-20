import { kMain } from "../../../data-display/data-display-types"
import { IGraphDataConfigurationModel } from "../../models/graph-data-configuration-model"
import { LSRLAdornmentModel, LSRLInstance } from "./lsrl-adornment-model"
import { LineLabelInstance } from "../line-label-instance"

const mockLSRLInstanceProps1 = {
  intercept: 1,
  interceptLocked: false,
  rSquared: 1,
  sdResiduals: 1,
  slope: 1
}
const mockLSRLInstanceProps2 = {
  intercept: 2,
  interceptLocked: false,
  rSquared: 2,
  sdResiduals: 2,
  slope: 2
}

describe("LSRLInstance", () => {
  it("is created with undefined equationCoords, intercept, rSquared, sdResiduals, and slope properties", () => {
    const lsrlInstance = LSRLInstance.create()
    const lsrlLabel = LineLabelInstance.create()
    expect(lsrlLabel.equationCoords).toBeUndefined()
    expect(lsrlInstance.intercept).toBeUndefined()
    expect(lsrlInstance.rSquared).toBeUndefined()
    expect(lsrlInstance.sdResiduals).toBeUndefined()
    expect(lsrlInstance.slope).toBeUndefined()
  })
  it("can have equationCoords properties set", () => {
    const lsrlLabel = LineLabelInstance.create()
    expect(lsrlLabel.equationCoords).toBeUndefined()
    lsrlLabel.setEquationCoords({x: 50, y: 50})
    expect(lsrlLabel.equationCoords?.x).toEqual(50)
    expect(lsrlLabel.equationCoords?.y).toEqual(50)
  })
  it("can have intercept properties set", () => {
    const lsrlInstance = LSRLInstance.create()
    expect(lsrlInstance.intercept).toBeUndefined()
    lsrlInstance.setIntercept(1)
    expect(lsrlInstance.intercept).toEqual(1)
  })
  it("can have rSquared properties set", () => {
    const lsrlInstance = LSRLInstance.create()
    expect(lsrlInstance.rSquared).toBeUndefined()
    lsrlInstance.setRSquared(1)
    expect(lsrlInstance.rSquared).toEqual(1)
  })
  it("can have slope properties set", () => {
    const lsrlInstance = LSRLInstance.create()
    expect(lsrlInstance.slope).toBeUndefined()
    lsrlInstance.setSlope(1)
    expect(lsrlInstance.slope).toEqual(1)
  })
  it("can have sdResiduals properties set", () => {
    const lsrlInstance = LSRLInstance.create()
    expect(lsrlInstance.sdResiduals).toBeUndefined()
    lsrlInstance.setSdResiduals(1)
    expect(lsrlInstance.sdResiduals).toEqual(1)
  })
})

describe("LSRLAdornmentModel", () => {
  it("is created with its type property set to 'LSRL' and with its lines property an empty map", () => {
    const lSRL = LSRLAdornmentModel.create()
    expect(lSRL.type).toEqual("LSRL")
    expect(lSRL.lines.size).toEqual(0)
  })
  it("can have a line added to its lines property", () => {
    const lSRL = LSRLAdornmentModel.create()
    lSRL.updateLines(mockLSRLInstanceProps1, "{}")
    expect(lSRL.lines.size).toEqual(1)
    const modelLine = lSRL.lines.get("{}")?.get(kMain)
    expect(modelLine?.intercept).toEqual(mockLSRLInstanceProps1.intercept)
    expect(modelLine?.rSquared).toEqual(mockLSRLInstanceProps1.rSquared)
    expect(modelLine?.sdResiduals).toEqual(mockLSRLInstanceProps1.sdResiduals)
    expect(modelLine?.slope).toEqual(mockLSRLInstanceProps1.slope)
  })
  it("can have multiple lines with different cellkeys added to its lines property", () => {
    const line1 = mockLSRLInstanceProps1
    const line2 = mockLSRLInstanceProps2
    const lSRL = LSRLAdornmentModel.create()
    lSRL.updateLines(line1, "cellkey1")
    lSRL.updateLines(line2, "cellkey2")
    expect(lSRL.lines.size).toEqual(2)
    const modelLine1 = lSRL.lines.get("cellkey1")?.get(kMain)
    const modelLine2 = lSRL.lines.get("cellkey2")?.get(kMain)
    expect(modelLine1?.intercept).toEqual(line1.intercept)
    expect(modelLine1?.rSquared).toEqual(line1.rSquared)
    expect(modelLine1?.sdResiduals).toEqual(line1.sdResiduals)
    expect(modelLine1?.slope).toEqual(line1.slope)
    expect(modelLine2?.intercept).toEqual(line2.intercept)
    expect(modelLine2?.rSquared).toEqual(line2.rSquared)
    expect(modelLine2?.sdResiduals).toEqual(line2.sdResiduals)
    expect(modelLine2?.slope).toEqual(line2.slope)
  })
  it("can have multiple lines with the same cellkey added to its lines property", () => {
    const line1 = mockLSRLInstanceProps1
    const line2 = mockLSRLInstanceProps2
    const lSRL = LSRLAdornmentModel.create()
    lSRL.updateLines(line1, "sameKey", "foo")
    lSRL.updateLines(line2, "sameKey", "bar")
    expect(lSRL.lines.size).toEqual(1)
    const modelLines = lSRL.lines.get("sameKey")
    const modelLine1 = modelLines?.get("foo")
    const modelLine2 = modelLines?.get("bar")
    expect(modelLine1?.intercept).toEqual(line1.intercept)
    expect(modelLine1?.rSquared).toEqual(line1.rSquared)
    expect(modelLine1?.sdResiduals).toEqual(line1.sdResiduals)
    expect(modelLine1?.slope).toEqual(line1.slope)
    expect(modelLine2?.intercept).toEqual(line2.intercept)
    expect(modelLine2?.rSquared).toEqual(line2.rSquared)
    expect(modelLine2?.sdResiduals).toEqual(line2.sdResiduals)
    expect(modelLine2?.slope).toEqual(line2.slope)
  })
  it("can have its showConfidenceBands property set", () => {
    const lSRL = LSRLAdornmentModel.create()
    expect(lSRL.showConfidenceBands).toEqual(false)
    lSRL.setShowConfidenceBands(true)
    expect(lSRL.showConfidenceBands).toEqual(true)
  })
  it("can have its showR property set", () => {
    const lSRL = LSRLAdornmentModel.create()
    expect(lSRL.showR).toEqual(false)
    lSRL.setShowR(true)
    expect(lSRL.showR).toEqual(true)
  })
  it("can have its showRSquared property set", () => {
    const lSRL = LSRLAdornmentModel.create()
    expect(lSRL.showRSquared).toEqual(false)
    lSRL.setShowRSquared(true)
    expect(lSRL.showRSquared).toEqual(true)
  })
  it("can get both the intercept and slope values of a line via the line's slopeAndIntercept view", () => {
    const lSRL = LSRLAdornmentModel.create()
    lSRL.updateLines(mockLSRLInstanceProps1, "{}")
    expect(lSRL.lines.get("{}")?.get(kMain)?.slopeAndIntercept).toEqual({intercept: 1, slope: 1})
  })

  describe("updateCategories", () => {
    // Helper to create a mock dataConfig for testing updateCategories
    function createMockDataConfig(options: {
      cellKeys: Record<string, string>[],
      legendCategories: string[],
      xAttrId?: string,
      yAttrId?: string
    }) {
      const { cellKeys, legendCategories, xAttrId = "xAttr", yAttrId = "yAttr" } = options
      return {
        getAllCellKeys: () => cellKeys,
        categoryArrayForAttrRole: (role: string) => role === "legend" ? legendCategories : [],
        getCategoriesOptions: () => ({
          xAttrId,
          yAttrId,
          xCats: [],
          yCats: [],
          topCats: [],
          rightCats: []
        }),
        subPlotCases: () => [],
        filterCasesForDisplay: () => [],
        dataset: undefined,
        attributeID: () => ""
      } as unknown as IGraphDataConfigurationModel
    }

    it("removes stale cell keys from lines when categories change", () => {
      const lSRL = LSRLAdornmentModel.create()

      // Manually add lines with specific cell keys (simulating prior state)
      const cellKey1 = { xAttr: "A" }
      const cellKey2 = { xAttr: "B" }
      const instanceKey1 = lSRL.instanceKey(cellKey1) // '{"xAttr":"A"}'
      const instanceKey2 = lSRL.instanceKey(cellKey2) // '{"xAttr":"B"}'

      lSRL.updateLines(mockLSRLInstanceProps1, instanceKey1, kMain)
      lSRL.updateLines(mockLSRLInstanceProps2, instanceKey2, kMain)
      expect(lSRL.lines.size).toEqual(2)

      // Now call updateCategories with only cellKey1 as valid
      const mockDataConfig = createMockDataConfig({
        cellKeys: [cellKey1], // Only cellKey1 is valid now
        legendCategories: [kMain]
      })

      lSRL.updateCategories({ dataConfig: mockDataConfig })

      // cellKey2 should be removed, cellKey1 should remain
      expect(lSRL.lines.size).toEqual(1)
      expect(lSRL.lines.has(instanceKey1)).toBe(true)
      expect(lSRL.lines.has(instanceKey2)).toBe(false)
    })

    it("removes stale cell keys from labels when categories change", () => {
      const lSRL = LSRLAdornmentModel.create()

      // Manually add labels with specific cell keys
      const cellKey1 = { xAttr: "A" }
      const cellKey2 = { xAttr: "B" }
      const instanceKey1 = lSRL.instanceKey(cellKey1)
      const instanceKey2 = lSRL.instanceKey(cellKey2)

      lSRL.setLabel(cellKey1, kMain, LineLabelInstance.create({ equationCoords: { x: 10, y: 10 } }))
      lSRL.setLabel(cellKey2, kMain, LineLabelInstance.create({ equationCoords: { x: 20, y: 20 } }))
      expect(lSRL.labels.size).toEqual(2)

      // Now call updateCategories with only cellKey1 as valid
      const mockDataConfig = createMockDataConfig({
        cellKeys: [cellKey1], // Only cellKey1 is valid now
        legendCategories: [kMain]
      })

      lSRL.updateCategories({ dataConfig: mockDataConfig })

      // cellKey2 should be removed from labels, cellKey1 should remain
      expect(lSRL.labels.size).toEqual(1)
      expect(lSRL.labels.has(instanceKey1)).toBe(true)
      expect(lSRL.labels.has(instanceKey2)).toBe(false)
    })

    it("handles keys consistently between lines and labels maps", () => {
      const lSRL = LSRLAdornmentModel.create()

      // Set up lines and labels with the same cell keys
      const cellKey1 = { xAttr: "A", yAttr: "1" }
      const cellKey2 = { xAttr: "B", yAttr: "2" }
      const cellKey3 = { xAttr: "C", yAttr: "3" }
      const instanceKey1 = lSRL.instanceKey(cellKey1)
      const instanceKey2 = lSRL.instanceKey(cellKey2)
      const instanceKey3 = lSRL.instanceKey(cellKey3)

      // Add lines and labels for all three cell keys
      lSRL.updateLines(mockLSRLInstanceProps1, instanceKey1, kMain)
      lSRL.updateLines(mockLSRLInstanceProps1, instanceKey2, kMain)
      lSRL.updateLines(mockLSRLInstanceProps1, instanceKey3, kMain)
      lSRL.setLabel(cellKey1, kMain, LineLabelInstance.create({ equationCoords: { x: 10, y: 10 } }))
      lSRL.setLabel(cellKey2, kMain, LineLabelInstance.create({ equationCoords: { x: 20, y: 20 } }))
      lSRL.setLabel(cellKey3, kMain, LineLabelInstance.create({ equationCoords: { x: 30, y: 30 } }))

      expect(lSRL.lines.size).toEqual(3)
      expect(lSRL.labels.size).toEqual(3)

      // Update categories to only include cellKey1 and cellKey2
      const mockDataConfig = createMockDataConfig({
        cellKeys: [cellKey1, cellKey2],
        legendCategories: [kMain]
      })

      lSRL.updateCategories({ dataConfig: mockDataConfig })

      // Both lines and labels should have the same keys removed
      expect(lSRL.lines.size).toEqual(2)
      expect(lSRL.labels.size).toEqual(2)

      // Verify the same keys are present in both
      expect(lSRL.lines.has(instanceKey1)).toBe(true)
      expect(lSRL.lines.has(instanceKey2)).toBe(true)
      expect(lSRL.lines.has(instanceKey3)).toBe(false)
      expect(lSRL.labels.has(instanceKey1)).toBe(true)
      expect(lSRL.labels.has(instanceKey2)).toBe(true)
      expect(lSRL.labels.has(instanceKey3)).toBe(false)
    })

    it("removes stale legend categories within a cell", () => {
      const lSRL = LSRLAdornmentModel.create()

      const cellKey = { xAttr: "A" }
      const instanceKey = lSRL.instanceKey(cellKey)

      // Add lines for multiple legend categories
      lSRL.updateLines(mockLSRLInstanceProps1, instanceKey, "cat1")
      lSRL.updateLines(mockLSRLInstanceProps2, instanceKey, "cat2")
      lSRL.updateLines({ ...mockLSRLInstanceProps1, slope: 3 }, instanceKey, "cat3")

      const linesInCell = lSRL.lines.get(instanceKey)
      expect(linesInCell?.size).toEqual(3)

      // Update categories to only include cat1 and cat2
      const mockDataConfig = createMockDataConfig({
        cellKeys: [cellKey],
        legendCategories: ["cat1", "cat2"] // cat3 is no longer valid
      })

      lSRL.updateCategories({ dataConfig: mockDataConfig })

      // cat3 should be removed from within the cell
      const updatedLinesInCell = lSRL.lines.get(instanceKey)
      expect(updatedLinesInCell?.size).toEqual(2)
      expect(updatedLinesInCell?.has("cat1")).toBe(true)
      expect(updatedLinesInCell?.has("cat2")).toBe(true)
      expect(updatedLinesInCell?.has("cat3")).toBe(false)
    })
  })
})
