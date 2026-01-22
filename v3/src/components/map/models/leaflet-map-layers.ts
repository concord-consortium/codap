import { action, comparer, makeObservable, observable, ObservableMap } from "mobx"
import { mstReaction } from "../../../utilities/mst-reaction"
import { IMapContentModel } from "./map-content-model"
import { kMapLayerTypeIndices } from "../map-types"

class LayerMapEntry {
  modelId: string
  index: number
  @observable invalid: boolean
  refresh: () => void

  constructor(modelId: string, index: number, refresh: () => void) {
    this.modelId = modelId
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
      () => Array.from(this.layers.values())
        .filter(entry => this.getLayerModel(entry.modelId) != null)
        .map(entry => ({ id: entry.modelId, invalid: entry.invalid })),
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

  // Look up a layer model by ID from mapContent
  getLayerModel(modelId: string) {
    return this.mapContent.layers.find(layer => layer.id === modelId)
  }

  @action
  updateLayer(modelId: string, refresh: () => void) {
    // Don't update if the model is no longer in the map
    if (!this.getLayerModel(modelId)) return

    const existingEntry = this.layers.get(modelId)
    if (existingEntry) {
      existingEntry.invalidate(refresh)
    } else {
      this.layers.set(modelId, new LayerMapEntry(modelId, this.layers.size, refresh))
    }
  }

  @action
  validate() {
    this.isValidating = true
    this.layers.forEach(entry => entry.validate())
    this.isValidating = false
  }

  @action
  removeDeadLayers() {
    // Remove entries for layers that are no longer in the map
    const deadLayerIds: string[] = []
    this.layers.forEach((entry, id) => {
      if (!this.getLayerModel(entry.modelId)) {
        deadLayerIds.push(id)
      }
    })
    deadLayerIds.forEach(id => this.layers.delete(id))
  }

  @action
  refresh() {
    // First, clean up any layers that have been removed from the map
    this.removeDeadLayers()

    const entries = Array.from(this.layers.values())
    // assign indices based on current mapContent layer order
    entries.forEach(entry => {
      if (this.getLayerModel(entry.modelId)) {
        entry.index = this.mapContent.layerIndexMap.get(entry.modelId) ?? entry.index
      }
    })
    // sort entries so that polygons are rendered before grids
    entries.sort((a, b) => {
      const aModel = this.getLayerModel(a.modelId)
      const bModel = this.getLayerModel(b.modelId)
      if (!aModel || !bModel) return 0
      const aTypeIndex = kMapLayerTypeIndices.get(aModel.type) ?? -1
      const bTypeIndex = kMapLayerTypeIndices.get(bModel.type) ?? -1
      if (aTypeIndex >= 0 && bTypeIndex >= 0 && aTypeIndex !== bTypeIndex) {
        return aTypeIndex - bTypeIndex
      }
      return a.index - b.index
    })
    // render layers starting with the first invalid entry
    let isInvalid = false
    for (const entry of entries) {
      if (!this.getLayerModel(entry.modelId)) continue
      if (isInvalid || entry.invalid) {
        isInvalid = true
        entry.refresh()
      }
    }
    // reset the invalid flags
    this.validate()
  }
}
