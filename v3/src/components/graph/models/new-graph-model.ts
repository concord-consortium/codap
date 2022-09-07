import {types} from "mobx-state-tree";
import {AxisModelUnion} from "./axis-model"
import {uniqueId} from "../../../utilities/js-utils"
import {PlotModelUnion} from "./plot-model"

export type Color = string
export const MstColor = types.string
export const PlotAttributeRoles = ["primary", "secondary", "legend", "verticalSplit", "horizontalSplit"] as const
// export type PlotAttributeRole = typeof PlotAttributeRoles[number]

export type BackgroundLockInfo = {
  locked: true,
  xAxisLowerBound: number,
  xAxisUpperBound: number,
  yAxisLowerBound: number,
  yAxisUpperBound: number
}

export const NumberToggleModel = types
  .model('NumberToggleModel', {})

export const NewGraphModel = types
  .model('GraphModel', {
    id: types.optional(types.identifier, () => uniqueId()),
    // keys are AxisPlaces
    axes: types.map(types.maybe(AxisModelUnion)),
    // todo: 3 dimensional, not 2
    plots: types.array(types.array(types.maybe(PlotModelUnion))),
    // Visual properties
    isTransparent: false,
    plotBackgroundColor: 'white', // types.optional(types.union(types.string,types.number), 'white')
    plotBackgroundOpacity: 1,
    // We'll have a document-level store of images as dataURLs and here we have IDs to them
    plotBackgroundImageID: types.optional(types.identifier, ''),
    // todo: how to use this type?
    plotBackgroundLockInfo: types.frozen<BackgroundLockInfo>(),
    // numberToggleModel: types.optional(types.union(NumberToggleModel, null))
  })
  .volatile(self => ({}))
