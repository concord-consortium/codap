import { action, computed, makeObservable, observable, override, reaction } from "mobx"
import { measureTextExtent } from "../../../hooks/use-measure-text"
import vars from "../../vars.scss"
import {AxisPlace, AxisPlaces, AxisBounds, IScaleType} from "../../axis/axis-types"
import {isVertical} from "../../axis-graph-shared"
import {IAxisLayout} from "../../axis/models/axis-layout-context"
import {MultiScale} from "../../axis/models/multi-scale"
import {Bounds, DataDisplayLayout, GraphExtentsPlace} from "../../data-display/models/data-display-layout"

interface BannerRegistration {
  height: number
  order: number
}

// When showLowerPlot is on, the plot area splits with the upper region getting (1 - kLowerPlotFraction)
// of the height and the lower region getting kLowerPlotFraction. Hardcoded per CODAP-1445 spec.
export const kLowerPlotFraction = 1 / 3

export class GraphLayout extends DataDisplayLayout implements IAxisLayout {
  // actual measured sizes of axis elements
  @observable axisBounds: Map<AxisPlace, AxisBounds> = new Map()
  axisScales: Map<AxisPlace, MultiScale> = new Map()
  desiredExtentsFromComponents: Map<GraphExtentsPlace, number> = new Map() // not necessarily the extent they get
  // Dynamic banner registration - allows any client to register a banner with a height and order
  @observable bannerHeights: Map<string, BannerRegistration> = new Map()
  // When true, splits the plot area into an upper (2/3) and lower (1/3) region — infrastructure
  // for the future Residual Plot adornment. See CODAP-1445. Default off preserves all existing behavior.
  @observable showLowerPlot = false
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
    if (place === 'leftLower') return this.getLowerPlotBounds().height
    return isVertical(place) ? this.plotHeight : this.plotWidth
  }

  getLowerPlotBounds(): Bounds {
    return this.getComputedBounds('lowerPlot')
  }

  /**
   * Map a numeric value to a y-pixel in the lower plot region, in the tile's outer coordinate space
   * (i.e. add this to nothing — it's already an absolute y within the tile). Returns undefined if
   * the lower scale isn't numeric or has no domain yet.
   */
  getLowerYCoord(value: number): number | undefined {
    const scale = this.getNumericScale('leftLower')
    if (!scale) return undefined
    return this.getLowerPlotBounds().top + scale(value)
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
    this.getAxisMultiScale(place)?.setLength(this.getAxisLength(place))
  }

  @action setShowLowerPlot(show: boolean) {
    if (this.showLowerPlot === show) return
    this.showLowerPlot = show
    // computedBounds reacts automatically via @observable, but the axis scale ranges are pull-updated
    // via updateScaleRanges — trigger it so the upper 'left' scale shrinks (or restores) and
    // 'leftLower' picks up its non-zero range.
    this.updateScaleRanges(this.plotWidth, this.plotHeight)
  }

  @action resetAxisScale(place: AxisPlace) {
    const multiScale = this.getAxisMultiScale(place)
    multiScale.setCategorySet(undefined)
    multiScale.setScaleType("ordinal")
    multiScale.setRepetitions(1)
  }

  /**
   * Register a banner with the layout. Banners are rendered above the plot area and
   * reduce the available plot height. Lower order values are rendered higher (closer to top).
   * @param id - Unique identifier for the banner
   * @param height - Height in pixels
   * @param order - Order value (lower = higher position)
   */
  @action registerBanner(id: string, height: number, order: number) {
    this.bannerHeights.set(id, { height, order })
    this.updateScaleRanges(this.plotWidth, this.plotHeight)
  }

  /**
   * Unregister a previously registered banner.
   * @param id - Unique identifier for the banner to remove
   */
  @action unregisterBanner(id: string) {
    this.bannerHeights.delete(id)
    this.updateScaleRanges(this.plotWidth, this.plotHeight)
  }

  /**
   * Computed total height of all registered banners.
   */
  @computed get totalBannersHeight(): number {
    let total = 0
    for (const { height } of this.bannerHeights.values()) {
      total += height
    }
    return total
  }

  @override setDesiredExtent(place: GraphExtentsPlace, extent: number) {
    this.desiredExtentsFromComponents.set(place, extent)
    // If the request is for a "large" extent, we set the minimum to 50px. But otherwise we don't require
    // a minimum so that we can honor small extents from empty axes or categorical axes where the categories
    // are parallel to the axis.
    const minimumExtent = extent > 50 ? 50 : 0
    const labelHeight = measureTextExtent('Xy', vars.labelFont).height
    switch (place) {
      case 'left':
      case 'leftLower':
      case 'rightNumeric':
      case 'rightCat': {
        extent = Math.max(minimumExtent, Math.min(extent, labelHeight + 2 * this.tileWidth / 5))
        break
      }
      case 'top':
      case 'bottom': {
        extent = Math.max(minimumExtent, Math.min(extent, labelHeight + 2 * this.tileHeight / 5))
        break
      }
    }
    this.desiredExtents.set(place, extent)
    this.updateScaleRanges(this.plotWidth, this.plotHeight)
  }

  updateScaleRanges(plotWidth: number, plotHeight: number) {
    const lowerHeight = this.getLowerPlotBounds().height
    AxisPlaces.forEach(place => {
      const length = place === 'leftLower'
        ? lowerHeight
        : isVertical(place) ? plotHeight : plotWidth
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
    const {desiredExtents, tileWidth, tileHeight, showLowerPlot} = this,
      topAxisHeight = desiredExtents.get('top') ?? 0,
      bannersHeight = this.totalBannersHeight,
      leftAxisWidth = desiredExtents.get('left') ?? 20,
      bottomAxisHeight = desiredExtents.get('bottom') ?? 20,
      legendHeight = desiredExtents.get('legend') ?? 0,
      v2AxisWidth = desiredExtents.get('rightNumeric') ?? 0,
      rightAxisWidth = desiredExtents.get('rightCat') ?? 0,
      plotWidth = tileWidth - leftAxisWidth - v2AxisWidth - rightAxisWidth,
      fullPlotHeight = tileHeight - bannersHeight - topAxisHeight - bottomAxisHeight - legendHeight,
      lowerPlotHeight = showLowerPlot ? Math.round(fullPlotHeight * kLowerPlotFraction) : 0,
      plotHeight = fullPlotHeight - lowerPlotHeight,
      plotTop = bannersHeight + topAxisHeight,
      lowerPlotTop = plotTop + plotHeight,
      newBounds: Record<GraphExtentsPlace, Bounds> = {
        left: {
          left: 0,
          top: plotTop,
          width: leftAxisWidth,
          height: plotHeight
        },
        leftLower: {
          left: 0,
          top: lowerPlotTop,
          // Zero width when inactive so no code path can accidentally size against it.
          width: showLowerPlot ? leftAxisWidth : 0,
          height: lowerPlotHeight
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
          top: plotTop,
          width: plotWidth,
          height: plotHeight
        },
        lowerPlot: {
          left: leftAxisWidth,
          top: lowerPlotTop,
          width: showLowerPlot ? plotWidth : 0,
          height: lowerPlotHeight
        },
        bottom: {
          left: leftAxisWidth,
          top: lowerPlotTop + lowerPlotHeight,
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
          top: plotTop,
          width: v2AxisWidth,
          height: plotHeight
        },
        rightCat: {
          left: leftAxisWidth + plotWidth,
          top: plotTop,
          width: rightAxisWidth,
          height: plotHeight
        },
        yPlus: {
          left: 0,
          top: plotTop,
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
