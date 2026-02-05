import { cellKeyToString, kDefaultCellKey } from "../../utilities/cell-key-utils"
import { GraphCellKey } from "../../graphing-types"
import { BarChartModel } from "./bar-chart-model"

// Mock the DotChartModel dependencies that BarChartModel extends
jest.mock("../dot-chart/dot-chart-model", () => {
  const { types } = require("mobx-state-tree")
  return {
    DotChartModel: types.model("DotChartModel", {})
      .volatile(() => ({
        graphApi: undefined
      }))
      .views(() => ({
        maxCellPercent: () => 100,
        getApiProps: () => ({}),
        getValidSecondaryAxis: () => undefined
      }))
  }
})

jest.mock("../plot-model", () => ({
  typesPlotType: (type: string) => require("mobx-state-tree").types.optional(
    require("mobx-state-tree").types.literal(type),
    type
  )
}))

describe("BarChartModel barSpecs", () => {
  it("setBarSpec and getBarSpec use consistent cell key format", () => {
    const barChart = BarChartModel.create({})
    const cellKey: GraphCellKey = { attr1: "value1", attr2: "value2" }

    barChart.setBarSpec(cellKey, 42, 10)

    // getBarSpec should find the value using the same cell key object
    const result = barChart.getBarSpec(cellKey)
    expect(result).toEqual({ value: 42, numCases: 10 })
  })

  it("setBarSpec and getBarSpec work with empty cell key", () => {
    const barChart = BarChartModel.create({})
    const emptyCellKey: GraphCellKey = {}

    barChart.setBarSpec(emptyCellKey, 100, 5)

    const result = barChart.getBarSpec(emptyCellKey)
    expect(result).toEqual({ value: 100, numCases: 5 })
  })

  it("replaceBarSpecs works with cellKeyToString format", () => {
    const barChart = BarChartModel.create({})
    const cellKey1: GraphCellKey = { attr1: "cat1" }
    const cellKey2: GraphCellKey = { attr1: "cat2" }

    // This simulates what BarChartFormulaAdapter does
    const newSpecs = new Map<string, { value: number, numCases: number }>()
    newSpecs.set(cellKeyToString(cellKey1), { value: 10, numCases: 2 })
    newSpecs.set(cellKeyToString(cellKey2), { value: 20, numCases: 3 })

    barChart.replaceBarSpecs(newSpecs)

    // getBarSpec should find values for both keys
    expect(barChart.getBarSpec(cellKey1)).toEqual({ value: 10, numCases: 2 })
    expect(barChart.getBarSpec(cellKey2)).toEqual({ value: 20, numCases: 3 })
  })

  it("uses kDefaultCellKey for empty cell keys (not empty string)", () => {
    const barChart = BarChartModel.create({})
    const emptyCellKey: GraphCellKey = {}

    barChart.setBarSpec(emptyCellKey, 50, 1)

    // The internal map should use kDefaultCellKey, not empty string
    expect(barChart.barSpecs.has(kDefaultCellKey)).toBe(true)
    expect(barChart.barSpecs.has("")).toBe(false)
  })

  it("clearBarSpecs removes all entries", () => {
    const barChart = BarChartModel.create({})

    barChart.setBarSpec({ attr1: "a" }, 1, 1)
    barChart.setBarSpec({ attr1: "b" }, 2, 2)
    expect(barChart.barSpecs.size).toBe(2)

    barChart.clearBarSpecs()
    expect(barChart.barSpecs.size).toBe(0)
  })
})
