/**
 * A GraphPointLayerModel is a DataDisplayLayerModel that is used in GraphContentModel. It is the
 * only layer type that is currently supported in GraphContentModel. It contains most of the information
 * needed to render a graph.
 */
import {Instance, SnapshotIn, types} from "mobx-state-tree"
import {DataDisplayLayerModel} from "../../data-display/models/data-display-layer-model"
import {GraphDataConfigurationModel} from "./graph-data-configuration-model"

export const kGraphPointLayerType = "graphPointLayer"

export const GraphPointLayerModel = DataDisplayLayerModel
  .named("GraphPointLayerModel")
  .props({
    type: types.optional(types.literal(kGraphPointLayerType), kGraphPointLayerType),
    dataConfiguration: types.optional(GraphDataConfigurationModel, () => GraphDataConfigurationModel.create({})),
  })
  .views(self => ({
    get isVisible() {
      return true
    }
  }))

export interface IGraphPointLayerModel extends Instance<typeof GraphPointLayerModel> {}

export interface IGraphPointLayerModelSnapshot extends SnapshotIn<typeof GraphPointLayerModel> {}
