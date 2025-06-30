import {action, computed, makeObservable, observable, override} from "mobx"
import {AxisPlace, AxisPlaces, AxisBounds, IScaleType} from "../../axis/axis-types"
import {isVertical} from "../../axis-graph-shared"
import {IAxisLayout} from "../../axis/models/axis-layout-context"
import {MultiScale} from "../../axis/models/multi-scale"
import {Bounds, DataDisplayLayout, GraphExtentsPlace} from "../../data-display/models/data-display-layout"

export class GraphLayout extends DataDisplayLayout implements IAxisLayout {
  // actual measured sizes of axis elements
  @observable axisBounds: Map<AxisPlace, AxisBounds> = new Map()
  axisScales: Map<AxisPlace, MultiScale> = new Map()

  constructor() {
    super()
    AxisPlaces.forEach(place => this.axisScales.set(place,
      new MultiScale({scaleType: "ordinal",
        orientation: isVertical(place) ? "vertical" : "horizontal"})))
    makeObservable(this)
  }

  cleanup() {
    for (const scale of this.axisScales.values()) {
      scale.cleanup()
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

  @action setAxisBounds(place: AxisPlace, bounds: AxisBounds | undefined) {
    if (bounds) {
      // We allow the axis to draw gridlines for bivariate numeric plots. Unfortunately, the gridlines end up as
      // part of the axis dom element so that we get in here with bounds that span the entire width or height of
      // the plot. We tried workarounds to get gridlines that were _not_ part of the axis element with the result
      // that the gridlines got out of sync with axis tick marks during drag. So we have this inelegant solution
      // that shouldn't affect the top and right axes when we get them but it may be worthwhile to
      // (TODO) figure out if there's a better way to render gridlines on background (or plot) so this isn't necessary.

      // given state of the graph, we may need to adjust the drop areas' bounds
      const newBounds = bounds
      const legendHeight = this.getDesiredExtent('legend')

      if (place === "bottom") {
        newBounds.height = Math.min(bounds.height, this.tileHeight - this.getAxisLength('left') - legendHeight)
        newBounds.top = this.plotHeight
      }

      if (place === "left") {
        newBounds.height = Math.min(bounds.height, this.tileHeight - legendHeight)
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
