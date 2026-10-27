import { Instance, types } from "mobx-state-tree"
import { DataSet, toCanonical } from "../../../../models/data/data-set"
import { DataSetMetadata } from "../../../../models/shared/data-set-metadata"
import { kOther } from "../../../data-display/data-display-types"
import { GraphDataConfigurationModel } from "../../models/graph-data-configuration-model"
import { CountAdornmentModel } from "./count-adornment-model"

describe("CountAdornmentModel", () => {
  it("is created with its type property set to 'Count'", () => {
    const count = CountAdornmentModel.create()
    expect(count.type).toEqual("Count")
  })

  describe("percentValue for a kOther cell", () => {
    const TreeModel = types.model("Tree", {
      data: DataSet,
      metadata: DataSetMetadata,
      config: GraphDataConfigurationModel
    })
    let tree: Instance<typeof TreeModel>

    beforeEach(() => {
      tree = TreeModel.create({ data: {}, metadata: {}, config: {} })
      tree.data.addAttribute({ id: "manyId", name: "many" })
      tree.data.addAttribute({ id: "fewId", name: "few" })
      tree.metadata.setData(tree.data)
      // 20 "many" values (2 cases each) crossed with 3 "few" values
      tree.data.addCases(toCanonical(tree.data, Array.from({ length: 40 }, (_, i) => (
        { __id__: `c${i}`, many: `m${i % 20}`, few: "ABC"[i % 3] }
      ))))
      tree.config.setDataset(tree.data, tree.metadata)
    })

    // the percent each cell of the kOther row/column shows, keyed by its "few" category
    const otherPercents = (count: Instance<typeof CountAdornmentModel>) => {
      const config = tree.config
      return config.getAllCellKeys()
        .filter(cellKey => cellKey.manyId === kOther)
        .map(cellKey => count.percentValue(config.subPlotCases(cellKey).length, cellKey, config))
    }

    it("is non-zero and sums to 100% across an Other row (Row %)", () => {
      tree.config.setAttribute("y", { attributeID: "manyId" })
      tree.config.setAttribute("x", { attributeID: "fewId" })
      tree.config.setNumberOfCategoriesLimitForRole("y", 5)
      const count = CountAdornmentModel.create({ showCount: true, showPercent: true, percentType: "row" })

      const percents = otherPercents(count)
      expect(percents).toHaveLength(3)
      percents.forEach(percent => expect(percent).toBeGreaterThan(0))
      expect(percents.reduce((sum, percent) => sum + percent, 0)).toBeCloseTo(1)
    })

    it("is non-zero and sums to 100% down an Other column (Column %)", () => {
      tree.config.setAttribute("x", { attributeID: "manyId" })
      tree.config.setAttribute("y", { attributeID: "fewId" })
      tree.config.setNumberOfCategoriesLimitForRole("x", 5)
      const count = CountAdornmentModel.create({ showCount: true, showPercent: true, percentType: "column" })

      const percents = otherPercents(count)
      expect(percents).toHaveLength(3)
      percents.forEach(percent => expect(percent).toBeGreaterThan(0))
      expect(percents.reduce((sum, percent) => sum + percent, 0)).toBeCloseTo(1)
    })
  })
})
