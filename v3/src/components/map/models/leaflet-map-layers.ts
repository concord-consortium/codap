import { action, comparer, makeObservable, observable, ObservableMap } from "mobx"
import { mstReaction } from "../../../utilities/mst-reaction"
import { IMapContentModel } from "./map-content-model"
import { IMapLayerModel } from "./map-layer-model"
import { kMapLayerTypeIndices } from "../map-types"

class LayerMapEntry {
  model: IMapLayerModel
  index: number
  @observable invalid: boolean
  refresh: () => void

  constructor(model: IMapLayerModel, index: number, refresh: () => void) {
    this.model = model
    this.index = index
    this.invalid = true
    this.refresh = refresh

    makeObservable(this)
  }

  @action
  invalidate(refresh: () => void) {
    this.refresh = refresh
    this.invalid = true
  }

  @action
  validate() {
    this.invalid = false
  }
}

export class LeafletMapLayers {
  mapContent: IMapContentModel
  layers: ObservableMap<string, LayerMapEntry> = new ObservableMap()
  timerId?: number
  disposer?: () => void
  isValidating: boolean = false

  constructor(mapContent: IMapContentModel) {
    this.mapContent = mapContent

    this.disposer = mstReaction(
      () => Array.from(this.layers.values()).map(layer => ({ id: layer.model.id, invalid: layer.invalid })),
      _layers => {
        if (this.isValidating || !_layers.some(layer => layer.invalid)) return
        if (this.timerId) {
          clearTimeout(this.timerId)
        }
        this.timerId = window.setTimeout(() => {
          this.refresh()
          this.timerId = undefined
        }, 10)
      },
      {name: "LeafletMapLayers.refreshOnLayerInvalidation", equals: comparer.structural},
      this.mapContent
    )

    makeObservable(this)
  }

  destroy() {
    this.disposer?.()
  }

  @action
  updateLayer(model: IMapLayerModel, refresh: () => void) {
    const existingEntry = this.layers.get(model.id)
    if (existingEntry) {
      existingEntry.invalidate(refresh)
    } else {
      this.layers.set(model.id, new LayerMapEntry(model, this.layers.size, refresh))
    }
  }

  @action
  validate() {
    this.isValidating = true
    this.layers.forEach(layer => layer.validate())
    this.isValidating = false
  }

  @action
  refresh() {
    const layers = Array.from(this.layers.values())
    // assign indices based on current mapContent layer order
    layers.forEach(layer => layer.index = this.mapContent.layerIndexMap.get(layer.model.id) ?? layer.index)
    // sort layers so that polygons are rendered before grids
    layers.sort((a, b) => {
      const aTypeIndex = kMapLayerTypeIndices.get(a.model.type) ?? -1
      const bTypeIndex = kMapLayerTypeIndices.get(b.model.type) ?? -1
      if (aTypeIndex >= 0 && bTypeIndex >= 0 && aTypeIndex !== bTypeIndex) {
        return aTypeIndex - bTypeIndex
      }
      return a.index - b.index
    })
    // render layers starting with the first invalid layer
    let isInvalid = false
    for (const layer of layers) {
      if (isInvalid || layer.invalid) {
        isInvalid = true
        layer.refresh()
      }
    }
    // reset the invalid flags
    this.validate()
  }
}
