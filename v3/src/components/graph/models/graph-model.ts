// import {boolean, string} from "mobx-state-tree/dist/types/primitives"
import {Instance, types} from "mobx-state-tree"
import { AdornmentModelUnion, MovableLineModel, MovableValueModel } from "../adornments/adornment-models"
import {AxisModelUnion, AxisPlace, IAxisModelUnion} from "./axis-model"
import { PlotType, PlotTypes } from "../graphing-types"
// import {uniqueId} from "../../../utilities/js-utils"
// import {gDataBroker} from "../../../data-model/data-broker"
// import {IDataSet} from "../../../data-model/data-set"

export const PlotAttributeRoles = ["primary", "secondary", "legend", "verticalSplit", "horizontalSplit"] as const
// export type PlotAttributeRole = typeof PlotAttributeRoles[number]

export const GraphModel = types
  .model("GraphModel", {
    // keys are AxisPlaces
    axes: types.map(types.maybe(AxisModelUnion)),
    plotType: types.enumeration(PlotTypes.slice()),
    // keys are AxisPlaces
    attributeIDs: types.map(types.string),
    // keys are adornment ids
    adornments: types.map(AdornmentModelUnion),
    // will eventually move into adornments map
    movableValue: MovableValueModel,
    movableLine: MovableLineModel
  })
  .volatile(self => ({
    cases: [] as string[]
  }))
  .views(self => ({
    getAxis(place: AxisPlace) {
      return self.axes.get(place)
    },
    getAttributeID(place: AxisPlace) {
      return self.attributeIDs.get(place)??''
    }
  }))
  .actions(self => ({
    setAxis(place: AxisPlace, axis: IAxisModelUnion) {
      self.axes.set(place, axis)
    },
    setAttributeID(place: AxisPlace, id: string) {
      self.attributeIDs.set(place, id)
    },
    setPlotType(type: PlotType) {
      self.plotType = type
    },
    setCases(cases: string[]) {
      self.cases = cases
    }
  }))
export interface IGraphModel extends Instance<typeof GraphModel> {}

//----------------------------------------
/*
export type Color = string
export const MstColor = types.string

export type BackgroundLockInfo = {
  locked: true,
  xAxisLowerBound: number,
  xAxisUpperBound: number,
  yAxisLowerBound: number,
  yAxisUpperBound: number
}

export const NumberToggleModel = types
  .model('NumberToggleModel', {

})

export const PlotModel = types
  .model('PlotModel', {
    // may not need this id
    id: types.optional(types.identifier, () => uniqueId()),
    // keys are PlotAttributeRoles
    attributeIDs: types.map(types.string),
    // keys are PlotAttributeRoles
    axisIDs: types.map(types.string)
  })
  .volatile(self=>({
    dataset: undefined as IDataSet | undefined
  }))
  .views(self =>  ({
    get cases() {
      return self.dataset?.cases
    }
  })
    .actions(self=>({

    })))

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
    plotBackgroundLockInfo: types.frozen< BackgroundLockInfo>(),
    numberToggleModel: types.optional(types.union(NumberToggleModel, null))
  })
  .volatile(self => ({
  }))
*/
