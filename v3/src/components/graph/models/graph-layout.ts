import {ScaleBand, ScaleContinuousNumeric, ScaleOrdinal, scaleOrdinal} from "d3"
import { action, computed, makeObservable, observable } from "mobx"
import { createContext, useContext } from "react"
import { AxisPlace, AxisPlaces } from "./axis-model"

export type ScaleNumericBaseType = ScaleContinuousNumeric<number, number>
export type ScaleType = ScaleContinuousNumeric<number, number> | ScaleOrdinal<string, any> | ScaleBand<string>

export const kDefaultGraphWidth = 480
export const kDefaultGraphHeight = 0
export const kDefaultLegendHeight = 50
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
  @observable legendHeight = kDefaultLegendHeight
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
    return Math.max(0, 0.8 * this.graphHeight - this.legendHeight)
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
      // We allow the axis to draw gridlines for bivariate numeric plots. Unfortunately, the gridlines end up as
      // part of the axis dom element so that we get in here with bounds that span the entire width or height of
      // the plot. We tried work arounds to get gridlines that were _not_ part of the axis element with the result
      // that the gridlines got out of synch with axis tick marks during drag. So we have this inelegant solution
      // that shouldn't affect the top and right axes when we get them but
      // todo: check to make sure this still works with top and right axes
      const newBounds = {
        left: bounds.left,
        top: place === 'bottom' ? this.axisLength('left') : bounds.top,
        width: place === 'left' ? this.graphWidth - this.axisLength('bottom') : bounds.width,
        height: place === 'bottom' ? this.graphHeight - this.axisLength('left') - this.legendHeight :
          place === 'left' ? this.graphHeight - this.legendHeight : bounds.height
      }
      this.axisBounds.set(place, newBounds)
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
    const plotHeight = 0.8 * height - this.legendHeight

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
