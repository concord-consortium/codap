import { Instance, types } from "@concord-consortium/mobx-state-tree"
import { DataSet, toCanonical } from "../../../models/data/data-set"
import { DataSetMetadata } from "../../../models/shared/data-set-metadata"
import { DataConfigurationModel } from "./data-configuration-model"

/*
 * The base model, which is what a map layer uses. GraphDataConfigurationModel replaces setAttribute
 * and setAttributeType, so its tests (graph-data-configuration-model.test.ts) do not cover these.
 */
const TreeModel = types.model("Tree", {
  data: DataSet,
  metadata: DataSetMetadata,
  config: DataConfigurationModel
})

describe("a locked legend in the base configuration", () => {
  let tree: Instance<typeof TreeModel>
  const caseIdOf = (itemId: string) => tree.data.getItemChildCaseId(itemId)!

  beforeEach(() => {
    tree = TreeModel.create({ data: {}, metadata: {}, config: {} })
    tree.data.addAttribute({ id: "legId", name: "leg" })
    tree.data.addAttribute({ id: "bigId", name: "big" })
    tree.metadata.setData(tree.data)
    tree.data.addCases(toCanonical(tree.data,
      Array.from({ length: 11 }, (_, i) => ({ __id__: `c${i}`, leg: i * 10, big: 1000 + i * 100 }))))
    tree.config.setDataset(tree.data, tree.metadata)
    tree.config.setAttribute("legend", { attributeID: "legId" })
    tree.config.setLegendQuantilesAreLocked(true)
  })

  it("keeps the locked range when the top cases are hidden", () => {
    tree.config.setHiddenCases([caseIdOf("c10")])
    expect(tree.config.legendDisplayRange).toEqual({ min: 0, max: 100 })
  })

  it("recomputes the locked values when the legend attribute changes", () => {
    tree.config.setAttribute("legend", { attributeID: "bigId" })
    expect(tree.config.legendQuantilesAreLocked).toBe(true)
    expect(tree.config.legendDisplayRange).toEqual({ min: 1000, max: 2000 })
  })

  it("recomputes the locked values when the legend type changes", () => {
    tree.config.setHiddenCases([caseIdOf("c10")])
    tree.config.setAttributeType("legend", "date")
    expect(tree.config.legendDisplayRange).toEqual({ min: 0, max: 90 })
  })

  it("unlocks when the legend attribute is removed", () => {
    tree.config.removeAttributeFromRole("legend", "legId")
    expect(tree.config.legendQuantilesAreLocked).toBe(false)
    expect(tree.config.legendLockedMax).toBeUndefined()
  })

  it("unlocks when the legend is treated as categorical", () => {
    tree.config.setAttributeType("legend", "categorical")
    expect(tree.config.legendQuantilesAreLocked).toBe(false)
  })

  it("keeps the locked values when the same legend attribute is set again", () => {
    tree.config.setHiddenCases([caseIdOf("c10")])
    tree.config.setAttribute("legend", { attributeID: "legId" })
    expect(tree.config.legendDisplayRange).toEqual({ min: 0, max: 100 })
  })

  it("keeps the locked values when the legend is set to the type it already has", () => {
    tree.config.setHiddenCases([caseIdOf("c10")])
    tree.config.setAttributeType("legend", "numeric")
    expect(tree.config.legendDisplayRange).toEqual({ min: 0, max: 100 })
  })
})
