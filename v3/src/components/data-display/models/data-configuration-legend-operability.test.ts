import { Instance, types } from "@concord-consortium/mobx-state-tree"
import { DataSet, toCanonical } from "../../../models/data/data-set"
import { missingColor } from "../../../utilities/color-utils"
import { DataSetMetadata } from "../../../models/shared/data-set-metadata"
import { DataConfigurationModel } from "./data-configuration-model"

/*
 * The base model, which is what a map layer uses. The graph's counterpart is in
 * graph-data-configuration-model.test.ts, and the two answer differently on purpose: that
 * difference is why there are two views here rather than one.
 *
 * The configuration has to share an MST tree with the dataset, as it does in the app. A standalone
 * DataConfigurationModel.create() silently keeps an undefined dataset, and then every collection
 * question answers as though the data were empty.
 */
const TreeModel = types.model("Tree", {
  data: DataSet,
  metadata: DataSetMetadata,
  config: DataConfigurationModel
})

describe("a legend attribute the base configuration cannot honor", () => {
  let tree: Instance<typeof TreeModel>

  beforeEach(() => {
    tree = TreeModel.create({ data: {}, metadata: {}, config: {} })
    tree.data.addAttribute({ id: "latId", name: "lat" })
    tree.data.addAttribute({ id: "legId", name: "leg" })
    tree.metadata.setData(tree.data)
    tree.data.addCases(toCanonical(tree.data, [
      { __id__: "c1", lat: "shared", leg: "land" },
      { __id__: "c2", lat: "shared", leg: "water" }
    ]))
    tree.config.setDataset(tree.data, tree.metadata)
    tree.config.setAttribute("lat", { attributeID: "latId" })
    tree.config.setAttribute("legend", { attributeID: "legId" })
  })

  // lat moves to a parent collection, leaving the legend childmost
  const makeLegendChildmost = () => tree.data.moveAttributeToNewCollection("latId")

  it("reports the assignment as inoperable, so the legend can still name it", () => {
    expect(tree.config.legendAttributeIsInoperable).toBe(false)

    makeLegendChildmost()

    expect(tree.config.legendAttributeIsInoperable).toBe(true)
    expect(tree.config.assignedLegendAttributeID).toBe("legId")
  })

  it("draws its points in the missing-value color, as a graph does", () => {
    /*
     * The base filters the unusable assignment out of attributeID, so the checks inside
     * getLegendColorForCase that read it would fall through and hand back nothing -- and the map
     * would draw normally colored points under a legend saying the attribute cannot distinguish
     * them. The inoperable state is answered ahead of those checks so both displays agree.
     */
    makeLegendChildmost()

    expect(tree.config.attributeID("legend")).toBe("")
    expect(tree.config.getLegendColorForCase("c1")).toBe(missingColor)
  })
})
