import clsx from "clsx"
import { observer } from "mobx-react-lite"
import React, { useEffect, useRef } from "react"
import { useMap } from "react-leaflet"
import { useForceUpdate } from "../../../hooks/use-force-update"
import { IDataSet } from "../../../models/data/data-set"
import { isSetCaseValuesAction } from "../../../models/data/data-set-actions"
import { ICaseCreation } from "../../../models/data/data-set-types"
import { insertCasesWithCustomUndoRedo } from "../../../models/data/data-set-undo"
import { selectCases, setSelectedCases } from "../../../models/data/data-set-utils"
import { onAnyAction } from "../../../utilities/mst-utils"
import { useDataDisplayLayout } from "../../data-display/hooks/use-data-display-layout"
import PlacedLocationMarker from "../assets/placed-location-marker.svg"
import { useMapModelContext } from "../hooks/use-map-model-context"
import { kPinColors } from "../map-types"
import { IMapPinLayerModel } from "../models/map-pin-layer-model"
import { datasetHasPinData, pinAttributesFromDataSet } from "../utilities/map-utils"
import { PinControls } from "./pin-controls"
import "./map-pin-layer.scss"

const mapPinHeight = 35
const mapPinWidth = 25

interface IMapPinProps {
  color?: string
  dataset: IDataSet
  id: string
  key?: string
  selected?: boolean
  x: number
  y: number
}
function MapPin({ color="#0068EA", dataset, id, selected, x, y }: IMapPinProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (e.shiftKey) {
      selectCases([id], dataset, !selected)
    } else {
      setSelectedCases([id], dataset)
    }
  }

  return (
    <button
      className={clsx("map-pin", { "selected-pin": selected })}
      onClick={handleClick}
      style={{ left: x, top: y }}
    >
      <PlacedLocationMarker color={color} />
    </button>
  )
}

interface IMapPinLayerProps {
  mapLayerModel: IMapPinLayerModel
}
export const MapPinLayer = observer(function MapPinLayer({ mapLayerModel }: IMapPinLayerProps) {
  const forceUpdate = useForceUpdate()
  const layerRef = useRef<HTMLDivElement>(null)
  const map = useMap()
  const mapModel = useMapModelContext()
  const layout = useDataDisplayLayout()

  const { dataConfiguration } = mapLayerModel
  const dataset = dataConfiguration?.dataset

  // Force a rerender when any relevant values change
  useEffect(() => {
    if (dataset) {
      return onAnyAction(dataset, action => {
        if (isSetCaseValuesAction(action)) {
          forceUpdate()
        }
      })
    }
  }, [dataset, forceUpdate])

  // Force a rerender when the map is resized, panned, or zoomed
  const { contentWidth: _contentWidth, contentHeight: _contentHeight } = layout
  const { center: _center, zoom: _zoom } = mapModel.leafletMapState

  // Bail if the dataset doesn't have the data we need
  if (!dataset || !datasetHasPinData(dataset)) return

  const { pinLatId, pinLongId } = pinAttributesFromDataSet(dataset)
  const colorId = dataset.attributes.find(attr => attr.type === "color")?.id

  const handleClick = (e: React.MouseEvent) => {
    if (mapLayerModel.addMode) {
      e.stopPropagation()
      mapLayerModel.setAddMode(false)

      const layerBB = layerRef.current?.getBoundingClientRect()
      if (!layerBB || !dataset) return
      const { lat, lng } = map.containerPointToLatLng([e.clientX - layerBB.x, e.clientY - layerBB.y])
      const color = kPinColors[(dataset.items.length ?? 0) % kPinColors.length]
      const newItem: ICaseCreation = { [pinLatId]: lat, [pinLongId]: lng }
      if (colorId) newItem[colorId] = color
      insertCasesWithCustomUndoRedo(dataset, [newItem])
    }
  }

  const renderPins = mapLayerModel.isVisible
  return (
    <div
      className={clsx("map-pin-layer", { "add-mode": mapLayerModel.addMode })}
      onClick={handleClick}
      ref={layerRef}
    >
      {renderPins && dataset.items.map(({ __id__ }, index) => {
        const lat = dataset.getNumeric(__id__, pinLatId)
        const long = dataset.getNumeric(__id__, pinLongId)
        if (lat == null || long == null || !isFinite(lat) || !isFinite(long)) return null

        const { x, y } = map.latLngToContainerPoint([lat, long])
        const pinX = x - mapPinWidth / 2
        const pinY = y - mapPinHeight
        
        const color = colorId ? dataset.getStrValue(__id__, colorId) : kPinColors[index % kPinColors.length]
        return (
          <MapPin
            color={color}
            dataset={dataset}
            id={__id__}
            key={`pin-${__id__}`}
            selected={dataset?.isCaseSelected(__id__)}
            x={pinX}
            y={pinY}
          />
        )
      })}
      <PinControls mapLayerModel={mapLayerModel} />
    </div>
  )
})
