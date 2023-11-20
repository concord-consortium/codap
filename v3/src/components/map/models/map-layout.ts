import {action, makeObservable, observable} from "mobx"
import {createContext, useContext} from "react"
import {DataDisplayLayout} from "../../data-display/models/data-display-layout"

export const kDefaultMapWidth = 480
export const kDefaultMapHeight = 300
export const kDefaultLegendHeight = 0

export interface Bounds {
  left: number
  top: number
  width: number
  height: number
}

export class MapLayout extends DataDisplayLayout {
  @observable mapWidth = kDefaultMapWidth
  @observable mapHeight = kDefaultMapHeight
  @observable legendHeight = kDefaultLegendHeight

  constructor() {
    super()
    makeObservable(this)
  }

/*
  @computed get categorySetArrays() {
    return Array.from(this.axisScales.values()).map(scale => Array.from(scale.categorySetValues))
  }

  @action setDesiredExtent(place: MapPlace, extent: number) {
    this.desiredExtents.set(place, extent)
    this.updateScaleRanges(this.plotWidth, this.plotHeight)
  }

*/
  @action setParentExtent(width: number, height: number) {
    this.mapWidth = width
    this.mapHeight = height
  }

}

export const MapLayoutContext = createContext<MapLayout>({} as MapLayout)


export const useMapLayoutContext = () => useContext(MapLayoutContext)
