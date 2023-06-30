/**
 * A GraphPointLayerModel is a DataDisplayLayerModel that is used in GraphContentModel. It is the
 * only layer type that is currently supported in GraphContentModel. It contains most of the information
 * needed to render a graph.
 */
import {Instance, SnapshotIn, types} from "mobx-state-tree"
import {DataDisplayLayerModel} from "../../data-display/models/data-display-layer-model"
import {IAxisModelUnion} from "../../axis/models/axis-model"
import {PlotType} from "../graphing-types"

export interface GraphProperties {
  axes: Record<string, IAxisModelUnion>
  plotType: PlotType
}

export type BackgroundLockInfo = {
  locked: true,
  xAxisLowerBound: number,
  xAxisUpperBound: number,
  yAxisLowerBound: number,
  yAxisUpperBound: number
}

export const NumberToggleModel = types
  .model('NumberToggleModel', {})

export const GraphPointLayerModel = DataDisplayLayerModel
  .named("GraphPointLayerModel").props({type: "graphPointLayer"})

export interface IGraphPointLayerModel extends Instance<typeof GraphPointLayerModel> {
}

export interface IGraphPointLayerModelSnapshot extends SnapshotIn<typeof GraphPointLayerModel> {
}

