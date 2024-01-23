import {action, computed, makeObservable, observable} from "mobx"
import {GraphPlace} from "../../axis-graph-shared"

export const kDefaultTileWidth = 300
export const kDefaultTileHeight = 300
interface ITileSize {
  tileWidth: number
  tileHeight: number
}

export type GraphExtentsPlace = GraphPlace | "banners"

export interface Bounds {
  left: number
  top: number
  width: number
  height: number
}

export class DataDisplayLayout {
  @observable tileWidth = kDefaultTileWidth
  @observable tileHeight = kDefaultTileHeight
  @observable isTileExtentInitialized = false
  // desired/required size of child elements
  @observable desiredExtents: Map<GraphExtentsPlace, number> = new Map()

  constructor(tileSize?: ITileSize) {
    if (tileSize) {
      this.tileWidth = tileSize.tileWidth
      this.tileHeight = tileSize.tileHeight
    }
    makeObservable(this)
  }

  @computed get contentWidth() {
    return this.tileWidth
  }

  @computed get contentHeight() {
    return this.tileHeight - this.getDesiredExtent('legend')
  }

  getDesiredExtent(place: GraphPlace) {
    return this.desiredExtents.get(place) ?? 0
  }

  @action setDesiredExtent(place: GraphPlace, extent: number) {
    this.desiredExtents.set(place, extent)
  }

  @action setTileExtent(width: number, height: number) {
    this.tileWidth = width
    this.tileHeight = height
    this.isTileExtentInitialized = true
  }

  /**
   * We assume that all the desired extents have been set so that we can compute new bounds.
   * We set the computedBounds only once at the end so there should be only one notification to respond to.
   */
  @computed get computedBounds() {
    const {desiredExtents, tileWidth, tileHeight} = this,
      legendHeight = desiredExtents.get('legend') ?? 0,
      newBounds: Partial<Record<GraphPlace, Bounds>> = {
        legend: {left: 6, top: tileHeight - legendHeight, width: tileWidth - 6, height: legendHeight},
      }
    return newBounds
  }

  getComputedBounds(place: GraphPlace) {
    return this.computedBounds[place]
  }
}
