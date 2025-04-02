import clsx from "clsx"
import { observer } from "mobx-react-lite"
import React, { useEffect, useRef, useState } from "react"
import { useMap } from "react-leaflet"
import { isSetCaseValuesAction } from "../../../models/data/data-set-actions"
import { ICaseCreation } from "../../../models/data/data-set-types"
import { onAnyAction } from "../../../utilities/mst-utils"
import { useDataDisplayLayout } from "../../data-display/hooks/use-data-display-layout"
import PlacedLocationMarker from "../assets/placed-location-marker.svg"
import { useMapModelContext } from "../hooks/use-map-model-context"
import { kPinColors } from "../map-types"
import { IMapPinLayerModel } from "../models/map-pin-layer-model"
import { pinAttributesFromDataSet } from "../utilities/map-utils"
import "./map-pin-layer.scss"

// FIX-ME: Can we get these numbers dynamically?
const mapPinHeight = 35
const mapPinWidth = 25

interface IMapPinProps {
  color?: string
  key?: string
  selected?: boolean
  x: number
  y: number
}
function MapPin({ color="#0068EA", selected, x, y }: IMapPinProps) {
  return (
    <button className={clsx("map-pin", { "selected-pin": selected })} style={{ left: x, top: y }}>
      <PlacedLocationMarker color={color} />
    </button>
  )
}

interface IMapPinLayerProps {
  mapLayerModel: IMapPinLayerModel
}
export const MapPinLayer = observer(function MapPinLayer({ mapLayerModel }: IMapPinLayerProps) {
  const [_forceRerender, setForceRerender] = useState(0)
  const layerRef = useRef<HTMLDivElement>(null)
  const map = useMap()
  const mapModel = useMapModelContext()
  const layout = useDataDisplayLayout()

  const { dataConfiguration } = mapLayerModel
  const dataset = dataConfiguration?.dataset
  const { pinLatId, pinLongId } = dataset ? pinAttributesFromDataSet(dataset) : { pinLatId: "", pinLongId: "" }
  const colorId = dataset?.attributes.find(attr => attr.type === "color")?.id

  // Force a rerender when any relevant values change
  useEffect(() => {
    if (dataset) {
      return onAnyAction(dataset, action => {
        if (isSetCaseValuesAction(action)) {
          setForceRerender((prev) => prev + 1)
        }
      })
    }
  }, [dataset])

  // Force a rerender when the map is resized, panned, or zoomed
  const { contentWidth: _contentWidth, contentHeight: _contentHeight } = layout
  const { center: _center, zoom: _zoom } = mapModel.leafletMapState

  const handleClick = (e: React.MouseEvent) => {
    if (mapLayerModel.addMode) {
      e.stopPropagation()
      mapLayerModel.setAddMode(false)

      const layerBB = layerRef.current?.getBoundingClientRect()
      if (!layerBB) return
      const { lat, lng } = map.containerPointToLatLng([e.clientX - layerBB.x, e.clientY - layerBB.y])
      const color = kPinColors[(dataset?.items.length ?? 0) % kPinColors.length]
      const newItem: ICaseCreation = { [pinLatId]: lat, [pinLongId]: lng }
      if (colorId) newItem[colorId] = color
      dataset?.addCases([newItem])
    }
  }

  const renderPins = mapLayerModel.isVisible
  return (
    <div
      className={clsx("map-pin-layer", { "add-mode": mapLayerModel.addMode })}
      onClick={handleClick}
      ref={layerRef}
    >
      {renderPins && dataset?.items.map(({ __id__ }) => {
        const lat = Number(dataset.getValue(__id__, pinLatId))
        const long = Number(dataset.getValue(__id__, pinLongId))
        if (!isFinite(lat) || !isFinite(long)) return null

        const { x, y } = map.latLngToContainerPoint([lat, long])
        const pinX = x - mapPinWidth / 2
        const pinY = y - mapPinHeight
        
        const color = colorId ? dataset.getStrValue(__id__, colorId) : undefined
        return (
          <MapPin
            color={color}
            key={`pin-${__id__}`}
            selected={dataset?.isCaseSelected(__id__)}
            x={pinX}
            y={pinY}
          />
        )
      })}
    </div>
  )
})
