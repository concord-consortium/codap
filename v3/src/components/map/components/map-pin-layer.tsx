import clsx from "clsx"
import { observer } from "mobx-react-lite"
import React, { useEffect, useState } from "react"
import { useMap } from "react-leaflet"
import { isSetCaseValuesAction } from "../../../models/data/data-set-actions"
import { onAnyAction } from "../../../utilities/mst-utils"
import { useDataDisplayLayout } from "../../data-display/hooks/use-data-display-layout"
import PlacedLocationMarker from "../assets/placed-location-marker.svg"
import { useMapModelContext } from "../hooks/use-map-model-context"
import { IMapPinLayerModel } from "../models/map-pin-layer-model"
import { pinAttributesFromDataSet } from "../utilities/map-utils"
import "./map-pin-layer.scss"

// FIX-ME: Can we get these numbers dynamically?
const mapPinHeight = 35
const mapPinWidth = 25

interface IMapPinProps {
  key?: string
  selected?: boolean
  x: number
  y: number
}
function MapPin({ selected, x, y }: IMapPinProps) {
  return (
    <button className={clsx("map-pin", { "selected-pin": selected })} style={{ left: x, top: y }}>
      <PlacedLocationMarker />
    </button>
  )
}

interface IMapPinLayerProps {
  mapLayerModel: IMapPinLayerModel
}
export const MapPinLayer = observer(function MapPinLayer({ mapLayerModel }: IMapPinLayerProps) {
  const [_forceRerender, setForceRerender] = useState(0)
  const map = useMap()
  const mapModel = useMapModelContext()
  const layout = useDataDisplayLayout()

  const { dataConfiguration } = mapLayerModel
  const dataset = dataConfiguration?.dataset
  const { pinLatId, pinLongId } = dataset ? pinAttributesFromDataSet(dataset) : { pinLatId: "", pinLongId: "" }

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

  const renderPins = mapLayerModel?.isVisible
  return (
    <div className="map-pin-layer">
      {renderPins && dataset?.items.map(({ __id__ }) => {
        const lat = Number(dataset.getValue(__id__, pinLatId))
        const long = Number(dataset.getValue(__id__, pinLongId))
        if (!isFinite(lat) || !isFinite(long)) return null

        const { x, y } = map.latLngToContainerPoint([lat, long])
        const pinX = x - mapPinWidth / 2
        const pinY = y - mapPinHeight
        
        return <MapPin selected={dataset?.isCaseSelected(__id__)} key={`pin-${__id__}`} x={pinX} y={pinY} />
      })}
    </div>
  )
})
