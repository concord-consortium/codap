/**
 * A DataDisplayContentModel is a base model for GraphContentModel and MapContentModel.
 * It owns a vector of DataDisplayLayerModels.
 */
import {types} from "mobx-state-tree"
import {TileContentModel} from "../../../models/tiles/tile-content"
import {DataDisplayLayerModelUnion} from "./data-display-layer-union"
import {PointDescriptionModel} from "./point-description-model"

export const DataDisplayContentModel = TileContentModel
  .named("DataDisplayContentModel")
  .props({
    layers: types.array(DataDisplayLayerModelUnion),
    pointDescription: types.optional(PointDescriptionModel, () => PointDescriptionModel.create()),
  })

