import {scaleBand, scaleLinear, scaleLog, scaleOrdinal} from "d3"
import {action, computed, makeObservable, observable} from "mobx"
import {createContext, useContext} from "react"
import {AxisPlace, AxisPlaces, AxisBounds, AxisScaleType, isVertical} from "../../axis/axis-types"
import {GraphPlace} from "../graphing-types"
import {IScaleType} from "../../axis/models/axis-model"
import {kTitleBarHeight} from "../../constants"

export const kDefaultGraphWidth = 480
export const kDefaultGraphHeight = 300
export const kDefaultLegendHeight = 0

export interface Bounds {
  left: number
  top: number
  width: number
  height: number
}

export const scaleTypeToD3Scale = (iScaleType: IScaleType) => {
  switch (iScaleType) {
    case "ordinal":
      return scaleOrdinal()
    case "band":
      return scaleBand()
    case "linear":
      return scaleLinear()
    case "log":
      return scaleLog()
  }
}

export const CategoricalLayouts = ["parallel", "perpendicular"] as const
export type CategoricalLayout = typeof CategoricalLayouts[number]

export class GraphLayout {
  @observable graphWidth = kDefaultGraphWidth
  @observable graphHeight = kDefaultGraphHeight
  @observable legendHeight = kDefaultLegendHeight
  // actual measured sizes of axis elements
  @observable axisBounds: Map<AxisPlace, AxisBounds> = new Map()
  // desired/required size of axis elements
  @observable desiredExtents: Map<GraphPlace, number> = new Map()
  axisScales: Map<AxisPlace, AxisScaleType> = new Map()

  constructor() {
    AxisPlaces.forEach(place => this.axisScales.set(place, scaleOrdinal()))
    makeObservable(this)
  }

  @computed get plotWidth() {
    return this.computedBounds.get('plot')?.width || this.graphWidth
  }

  @computed get plotHeight() {
    return this.computedBounds.get('plot')?.height || this.graphHeight - this.legendHeight
  }

  getAxisLength(place: AxisPlace) {
    return isVertical(place) ? this.plotHeight : this.plotWidth
  }

  getAxisBounds(place: AxisPlace) {
    return this.axisBounds.get(place)
  }

  @action setAxisBounds(place: AxisPlace, bounds: AxisBounds | undefined) {
    if (bounds) {
      // We allow the axis to draw gridlines for bivariate numeric plots. Unfortunately, the gridlines end up as
      // part of the axis dom element so that we get in here with bounds that span the entire width or height of
      // the plot. We tried workarounds to get gridlines that were _not_ part of the axis element with the result
      // that the gridlines got out of synch with axis tick marks during drag. So we have this inelegant solution
      // that shouldn't affect the top and right axes when we get them but it may be worthwhile to
      // (TODO) figure out if there's a better way to render gridlines on background (or plot) so this isn't necessary.

      // given state of the graph, we may need to adjust the drop areas' bounds
      const newBounds = bounds

      if (place === "bottom") {
        newBounds.height = Math.min(bounds.height, this.graphHeight - this.getAxisLength('left') - this.legendHeight)
        newBounds.top = this.plotHeight
      }

      if (place === "left") {
        newBounds.height = Math.min(bounds.height, this.graphHeight - this.legendHeight)
        // if gridlines are present, axis will grow to .width + plotWidth, so we recalculate
        if (bounds.width > this.plotWidth) {
          newBounds.width -= this.plotWidth
        }
      }

      this.axisBounds.set(place, newBounds)
    } else {
      this.axisBounds.delete(place)
    }
  }

  getAxisScale(place: AxisPlace) {
    return this.axisScales.get(place)
  }

  @action setAxisScale(place: AxisPlace, scale: AxisScaleType) {
    scale.range(isVertical(place) ? [this.plotHeight, 0] : [0, this.plotWidth])
    this.axisScales.set(place, scale)
  }

  @action setDesiredExtent(place: GraphPlace, extent: number) {
    this.desiredExtents.set(place, extent)
  }

  updateScaleRanges(plotWidth: number, plotHeight: number) {
    AxisPlaces.forEach(place => {
      const range = isVertical(place) ? [plotHeight, 0] : [0, plotWidth]
      this.getAxisScale(place)?.range(range)
    })
  }

  @action setParentExtent(width: number, height: number) {
    this.graphWidth = width
    this.graphHeight = height
  }

  /**
   * We assume that all the desired extents have been set so that we can compute new bounds.
   * We set the computedBounds only once at the end so there should be only one notification to respond to.
   * Todo: Eventually there will be additional room set aside at the top for formulas
   */
  @computed get computedBounds() {
    const {desiredExtents, graphWidth, graphHeight} = this,
      topAxisHeight = desiredExtents.get('top') ?? 0,
      leftAxisWidth = desiredExtents.get('left') ?? 20,
      bottomAxisHeight = desiredExtents.get('bottom') ?? 20,
      legendHeight = desiredExtents.get('legend') ?? 0,
      v2AxisWidth = desiredExtents.get('rightNumeric') ?? 0,
      rightAxisWidth = desiredExtents.get('rightCat') ?? 0,
      newBounds: Map<GraphPlace, Bounds> = new Map(),
      plotWidth = graphWidth - leftAxisWidth - v2AxisWidth - rightAxisWidth,
      plotHeight = graphHeight - topAxisHeight - bottomAxisHeight - legendHeight
    newBounds.set('left',
      {left: 0, top: 0, width: leftAxisWidth, height: plotHeight})
    newBounds.set('top',
      {left: leftAxisWidth, top: kTitleBarHeight, width: graphWidth - leftAxisWidth - rightAxisWidth,
        height: topAxisHeight})
    newBounds.set('plot',
      {left: leftAxisWidth, top: topAxisHeight, width: plotWidth, height: plotHeight})
    newBounds.set('bottom',
      {left: leftAxisWidth, top: topAxisHeight + plotHeight, width: plotWidth,
        height: bottomAxisHeight})
    newBounds.set('legend',
      {left: 6, top: graphHeight - legendHeight, width: graphWidth - 6,
        height: legendHeight})
    newBounds.set('rightNumeric',
      {left: leftAxisWidth + plotWidth, top: topAxisHeight, width: v2AxisWidth,
        height: plotHeight})
    newBounds.set('rightCat',
      {left: leftAxisWidth + plotWidth, top: topAxisHeight, width: rightAxisWidth,
        height: plotHeight})
    // console.log(`newBounds.left = ${JSON.stringify(newBounds.get('left'))}`)
    return newBounds
  }

  getComputedBounds(place: AxisPlace) {
    return this.computedBounds.get(place)
  }
}

export const GraphLayoutContext = createContext<GraphLayout>({} as GraphLayout)


export const useGraphLayoutContext = () => useContext(GraphLayoutContext)
