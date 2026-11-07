import { types } from "@concord-consortium/mobx-state-tree"
import { DataSet, toCanonical } from "../../../models/data/data-set"
import { DataSetMetadata } from "../../../models/shared/data-set-metadata"
import { MapPointLayerModel } from "./map-point-layer-model"

/*
 * The layer's data configuration has to share an MST tree with the dataset, as it does in the app.
 * See data-configuration-legend-operability.test.ts.
 */
const TreeModel = types.model("Tree", {
  data: DataSet,
  metadata: DataSetMetadata,
  layer: MapPointLayerModel
})

/**
 * Creates a point layer showing a dataset with lat/long attributes "latId"/"longId" and three cases:
 * c1 and c2 at the same location, and c3 with no latitude.
 */
export function createPointLayerTree() {
  const tree = TreeModel.create({ data: {}, metadata: {}, layer: {} })
  tree.data.addAttribute({ id: "latId", name: "lat" })
  tree.data.addAttribute({ id: "longId", name: "long" })
  tree.metadata.setData(tree.data)
  tree.data.addCases(toCanonical(tree.data, [
    { __id__: "c1", lat: 42, long: -71 },
    { __id__: "c2", lat: 42, long: -71 },
    { __id__: "c3", lat: "", long: -71 }
  ]))
  tree.layer.dataConfiguration.setDataset(tree.data, tree.metadata)
  tree.layer.dataConfiguration.setAttribute("lat", { attributeID: "latId" })
  tree.layer.dataConfiguration.setAttribute("long", { attributeID: "longId" })
  return tree
}
