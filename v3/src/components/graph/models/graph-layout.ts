import { action, computed, makeObservable, observable, override, reaction } from "mobx"
import { measureTextExtent } from "../../../hooks/use-measure-text"
import vars from "../../vars.scss"
import {AxisPlace, AxisPlaces, AxisBounds, IScaleType} from "../../axis/axis-types"
import {isVertical} from "../../axis-graph-shared"
import {IAxisLayout} from "../../axis/models/axis-layout-context"
import {MultiScale} from "../../axis/models/multi-scale"
import {Bounds, DataDisplayLayout, GraphExtentsPlace} from "../../data-display/models/data-display-layout"

export class GraphLayout extends DataDisplayLayout implements IAxisLayout {
  // actual measured sizes of axis elements
  @observable axisBounds: Map<AxisPlace, AxisBounds> = new Map()
  axisScales: Map<AxisPlace, MultiScale> = new Map()
  desiredExtentsFromComponents: Map<GraphExtentsPlace, number> = new Map() // not necessarily the extent they get
  private disposer?: () => void

  constructor() {
    super()
    AxisPlaces.forEach(place => this.axisScales.set(place,
      new MultiScale({scaleType: "ordinal",
        orientation: isVertical(place) ? "vertical" : "horizontal"})))
    makeObservable(this)

    // When the graph changes size, any categorical axes may get a different extent based on the constraint
    // that the axis cannot be larger than 2/5 of the graph height/width.
    this.disposer = reaction(
      () => [this.tileWidth, this.tileHeight],
      () => {
        AxisPlaces.forEach(place => {
          const desiredExtentFromComponent = this.desiredExtentsFromComponents.get(place)
          if (desiredExtentFromComponent) {
            this.setDesiredExtent(place, desiredExtentFromComponent) // trigger recompute
          }
        })
      }
    )
  }

  cleanup() {
    for (const scale of this.axisScales.values()) {
      scale.cleanup()
    }
    if (this.disposer) {
      this.disposer()
      this.disposer = undefined
    }
  }

  @override get contentWidth() {
    return this.computedBounds.plot.width || super.contentWidth
  }

  @override get contentHeight() {
    return this.computedBounds.plot.height || super.contentHeight
  }

  @computed get plotWidth() {
    return this.contentWidth
  }

  @computed get plotHeight() {
    return this.contentHeight
  }

  getAxisLength(place: AxisPlace) {
    return isVertical(place) ? this.plotHeight : this.plotWidth
  }

  getAxisBounds(place: AxisPlace) {
    return this.axisBounds.get(place)
  }

  getAxisMultiScale(place: AxisPlace) {
    return this.axisScales.get(place) ??
      new MultiScale({scaleType: "ordinal", orientation: "horizontal"})
  }

  @computed get categorySetArrays() {
    return Array.from(this.axisScales.values()).map(scale => Array.from(scale.categoryValues))
  }

  getAxisScale(place: AxisPlace) {
    return this.axisScales.get(place)?.scale
  }

  getNumericScale(place: AxisPlace) {
    return this.axisScales.get(place)?.numericScale
  }

  getBandScale(place: AxisPlace) {
    return this.axisScales.get(place)?.bandScale
  }

  getCategoricalScale(place: AxisPlace) {
    return this.axisScales.get(place)?.categoricalScale
  }

  @action setAxisScaleType(place: AxisPlace, scale: IScaleType) {
    this.getAxisMultiScale(place)?.setScaleType(scale)
    const length = isVertical(place) ? this.plotHeight : this.plotWidth
    this.getAxisMultiScale(place)?.setLength(length)
  }

  @action resetAxisScale(place: AxisPlace) {
    const multiScale = this.getAxisMultiScale(place)
    multiScale.setCategorySet(undefined)
    multiScale.setScaleType("ordinal")
    multiScale.setRepetitions(1)
  }

  @override setDesiredExtent(place: GraphExtentsPlace, extent: number) {
    this.desiredExtentsFromComponents.set(place, extent)
    const labelHeight = measureTextExtent('Xy', vars.labelFont).height
    switch (place) {
      case 'left':
      case 'rightNumeric':
      case 'rightCat': {
        extent = Math.max(50, Math.min(extent, labelHeight + 2 * this.tileWidth / 5))
        break
      }
      case 'top':
      case 'bottom': {
        extent = Math.max(50, Math.min(extent, labelHeight + 2 * this.tileHeight / 5))
        break
      }
    }
    this.desiredExtents.set(place, extent)
    this.updateScaleRanges(this.plotWidth, this.plotHeight)
  }

  updateScaleRanges(plotWidth: number, plotHeight: number) {
    AxisPlaces.forEach(place => {
      const length = isVertical(place) ? plotHeight : plotWidth
      this.getAxisMultiScale(place)?.setLength(length)
    })
  }

  @override setTileExtent(width: number, height: number) {
    if (width < 0 || height < 0) {
      return
    }
    super.setTileExtent(width, height)
    this.updateScaleRanges(this.plotWidth, this.plotHeight)
  }

  /**
   * We assume that all the desired extents have been set so that we can compute new bounds.
   * We set the computedBounds only once at the end so there should be only one notification to respond to.
   */
  @override get computedBounds() {
    const {desiredExtents, tileWidth, tileHeight} = this,
      topAxisHeight = desiredExtents.get('top') ?? 0,
      bannersHeight = desiredExtents.get('banners') ?? 0,
      leftAxisWidth = desiredExtents.get('left') ?? 20,
      bottomAxisHeight = desiredExtents.get('bottom') ?? 20,
      legendHeight = desiredExtents.get('legend') ?? 0,
      v2AxisWidth = desiredExtents.get('rightNumeric') ?? 0,
      rightAxisWidth = desiredExtents.get('rightCat') ?? 0,
      plotWidth = tileWidth - leftAxisWidth - v2AxisWidth - rightAxisWidth,
      plotHeight = tileHeight - bannersHeight - topAxisHeight - bottomAxisHeight - legendHeight,
      newBounds: Record<GraphExtentsPlace, Bounds> = {
        left: {
          left: 0,
          top: bannersHeight + topAxisHeight,
          width: leftAxisWidth,
          height: plotHeight
        },
        banners: {
          left: leftAxisWidth,
          top: 0,
          width: tileWidth,
          height: topAxisHeight
        },
        top: {
          left: leftAxisWidth,
          top: bannersHeight,
          width: tileWidth - leftAxisWidth - rightAxisWidth,
          height: topAxisHeight
        },
        plot: {
          left: leftAxisWidth,
          top: bannersHeight + topAxisHeight,
          width: plotWidth,
          height: plotHeight
        },
        bottom: {
          left: leftAxisWidth,
          top: bannersHeight + topAxisHeight + plotHeight,
          width: plotWidth,
          height: bottomAxisHeight
        },
        legend: {
          left: 6,
          top: tileHeight - legendHeight,
          width: tileWidth - 6,
          height: legendHeight
        },
        rightNumeric: {
          left: leftAxisWidth + plotWidth,
          top: bannersHeight + topAxisHeight,
          width: v2AxisWidth,
          height: plotHeight
        },
        rightCat: {
          left: leftAxisWidth + plotWidth,
          top: bannersHeight + topAxisHeight,
          width: rightAxisWidth,
          height: plotHeight
        },
        yPlus: {
          left: 0,
          top: bannersHeight + topAxisHeight,
          width: leftAxisWidth,
          height: plotHeight
        } // This value is not used
      }
    return newBounds
  }

  @override get numRows() {
    return this.getAxisMultiScale('left').repetitions
  }

  @override get numColumns() {
    return this.getAxisMultiScale('bottom').repetitions
  }
}
