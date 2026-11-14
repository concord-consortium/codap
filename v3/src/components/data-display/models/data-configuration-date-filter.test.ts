import { Instance, types } from "@concord-consortium/mobx-state-tree"
import { DataSet, toCanonical } from "../../../models/data/data-set"
import { DataSetMetadata } from "../../../models/shared/data-set-metadata"
import { DataConfigurationModel } from "./data-configuration-model"

const TreeModel = types.model("Tree", {
  data: DataSet,
  metadata: DataSetMetadata,
  config: DataConfigurationModel
})

describe("a date attribute on an axis role", () => {
  let tree: Instance<typeof TreeModel>

  beforeEach(() => {
    tree = TreeModel.create({ data: {}, metadata: {}, config: {} })
    tree.data.addAttribute({ id: "dateId", name: "when", userType: "date" })
    tree.metadata.setData(tree.data)
    tree.data.addCases(toCanonical(tree.data, [
      { __id__: "c1", when: "1/1/2024" },
      { __id__: "c2", when: "a" },
      { __id__: "c3", when: "" }
    ]))
    tree.config.setDataset(tree.data, tree.metadata)
  })

  it("plots only the cases whose value is a readable date", () => {
    tree.config.setAttribute("x", { attributeID: "dateId" })
    expect(tree.config.attributeType("x")).toBe("date")
    expect(tree.config.filterCase(tree.data, "c1")).toBe(true)
    expect(tree.config.filterCase(tree.data, "c2")).toBe(false)
    expect(tree.config.filterCase(tree.data, "c3")).toBe(false)
  })
})
