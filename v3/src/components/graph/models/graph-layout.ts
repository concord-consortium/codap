import { ScaleContinuousNumeric, scaleLinear } from "d3"
import { action, computed, makeObservable, observable } from "mobx"
import { createContext, useContext } from "react"
import { AxisPlace, AxisPlaces } from "./axis-model"

export type ScaleBaseType = ScaleContinuousNumeric<number, number>

export const kDefaultGraphWidth = 480
export const kDefaultGraphHeight = 360
export const kDefaultPlotWidth = 0.8 * kDefaultGraphWidth
export const kDefaultPlotHeight = 0.8 * kDefaultGraphHeight

export class GraphLayout {
  @observable graphWidth = kDefaultGraphWidth
  @observable graphHeight = kDefaultGraphHeight
  @observable margin = ({ top: 10, right: 30, bottom: 30, left: 60 })
  axisScales: Map<AxisPlace, ScaleBaseType>

  constructor() {
    this.axisScales = new Map()
    AxisPlaces.forEach(place => this.axisScales.set(place, scaleLinear()))
    makeObservable(this)
  }

  @computed get plotWidth() {
    return 0.8 * this.graphWidth
  }

  @computed get plotHeight() {
    return 0.8 * this.graphHeight
  }

  isHorizontal(place: AxisPlace) {
    return ["bottom", "top"].includes(place)
  }

  isVertical(place: AxisPlace) {
    return ["left", "right"].includes(place)
  }

  axisLength(place: AxisPlace) {
    return this.isVertical(place) ? this.plotHeight : this.plotWidth
  }

  axisScale(place: AxisPlace) {
    return this.axisScales.get(place) as ScaleBaseType
  }

  @action setAxisScale(place: AxisPlace, scale: ScaleBaseType) {
    this.axisScales.set(place, scale)
  }

  @action setGraphExtent(width: number, height: number) {
    const plotWidth = 0.8 * width
    const plotHeight = 0.8 * height

    // update d3 scale ranges before updating graph properties
    AxisPlaces.forEach(place => {
      const range = this.isVertical(place) ? [plotHeight, 0] : [0, plotWidth]
      this.axisScale(place).range(range)
    })

    this.graphWidth = width
    this.graphHeight = height
  }
}

export const GraphLayoutContext = createContext(new GraphLayout())

export const useGraphLayoutContext = () => useContext(GraphLayoutContext)
