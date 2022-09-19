import {ScaleBand, ScaleContinuousNumeric, ScaleOrdinal, scaleOrdinal} from "d3"
import { action, computed, makeObservable, observable } from "mobx"
import { createContext, useContext } from "react"
import { AxisPlace, AxisPlaces } from "./axis-model"

export type ScaleNumericBaseType = ScaleContinuousNumeric<number, number>
export type ScaleType = ScaleContinuousNumeric<number, number> | ScaleOrdinal<string, any> | ScaleBand<string>

export const kDefaultGraphWidth = 480
export const kDefaultGraphHeight = 0
export const kDefaultPlotWidth = 0.8 * kDefaultGraphWidth
export const kDefaultPlotHeight = 0.8 * kDefaultGraphHeight

export interface Bounds {
  left: number
  top: number
  width: number
  height: number
}

export class GraphLayout {
  @observable graphWidth = kDefaultGraphWidth
  @observable graphHeight = kDefaultGraphHeight
  @observable margin = ({ top: 10, right: 30, bottom: 30, left: 60 })
  @observable axisBounds: Map<AxisPlace, Bounds> = new Map()
  axisScales: Map<AxisPlace, ScaleType> = new Map()

  constructor() {
    AxisPlaces.forEach(place => this.axisScales.set(place, scaleOrdinal()))
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

  getAxisBounds(place: AxisPlace) {
    return this.axisBounds.get(place)
  }

  @action setAxisBounds(place: AxisPlace, bounds: Bounds | undefined) {
    if (bounds) {
      this.axisBounds.set(place, bounds)
    }
    else {
      this.axisBounds.delete(place)
    }
  }

  axisScale(place: AxisPlace) {
    return this.axisScales.get(place)
  }

  @action setAxisScale(place: AxisPlace, scale: ScaleType) {
    scale.range(this.isVertical(place) ? [this.plotHeight, 0] : [0, this.plotWidth])
    this.axisScales.set(place, scale)
  }

  @action setGraphExtent(width: number, height: number) {
    const plotWidth = 0.8 * width
    const plotHeight = 0.8 * height

    // update d3 scale ranges before updating graph properties
    AxisPlaces.forEach(place => {
      const range = this.isVertical(place) ? [plotHeight, 0] : [0, plotWidth]
      this.axisScale(place)?.range(range)
    })

    this.graphWidth = width
    this.graphHeight = height
  }
}

export const GraphLayoutContext = createContext(new GraphLayout())

export const useGraphLayoutContext = () => useContext(GraphLayoutContext)
