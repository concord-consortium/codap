import React, {MutableRefObject, useCallback, useEffect, useRef} from "react"
import {observer} from "mobx-react-lite"
import {clsx} from "clsx"
import {MapContainer, TileLayer} from "react-leaflet"
import {kPortalClass} from "../../data-display/data-display-types"
import {BaseMapKeys, kMapAttribution, kMapUrls} from "../map-types"
import {GraphPlace} from "../../axis-graph-shared"
import {useForceUpdate} from "../../../hooks/use-force-update"
import {useMapModelContext} from "../hooks/use-map-model-context"
import {useDataDisplayLayout} from "../../data-display/hooks/use-data-display-layout"
import {MultiLegend} from "../../data-display/components/legend/multi-legend"
import {usePixiPointsArray} from "../../data-display/hooks/use-pixi-points-array"
import {logStringifiedObjectMessage} from "../../../lib/log-message"
import {DroppableMapArea} from "./droppable-map-area"
import {MapBackground} from "./map-background"
import {MapInterior} from "./map-interior"
import {MapMarqueeSelectButton} from "./map-marquee-select-button"
import {IDataSet} from "../../../models/data/data-set"
import {isMapPointLayerModel} from "../models/map-point-layer-model"
import {MapGridSlider} from "./map-grid-slider"

import 'leaflet/dist/leaflet.css'
import "./map.scss"

interface IProps {
  mapRef: MutableRefObject<HTMLDivElement | null>
}

export const CodapMap = observer(function CodapMap({mapRef}: IProps) {
  const mapModel = useMapModelContext(),
    layout = useDataDisplayLayout(),
    mapHeight = layout.contentHeight,
    interiorDivRef = useRef<HTMLDivElement>(null),
    prevMapSize = useRef<{ width: number, height: number, legend: number }>({width: 0, height: 0, legend: 0}),
    forceUpdate = useForceUpdate(),
    pixiPointsArrayRef = usePixiPointsArray()

  // trigger an additional render once references have been fulfilled
  useEffect(() => forceUpdate(), [forceUpdate])

  const handleChangeLegendAttribute = useCallback((dataSet: IDataSet, attrId: string) => {
    mapModel.applyModelChange(
      () => mapModel.setLegendAttributeID(dataSet.id, attrId),
      {
        undoStringKey: "V3.Undo.mapLegendAttributeChange",
        redoStringKey: "V3.Redo.mapLegendAttributeChange",
        log: logStringifiedObjectMessage("legendAttributeChange: %@", {to_attribute: dataSet.attrFromID(attrId)?.name})
      }
    )
  }, [mapModel])
  const callHandleChangeAttribute = useCallback((_place: GraphPlace, dataSet: IDataSet, attrId: string) => {
    handleChangeLegendAttribute(dataSet, attrId)
  }, [handleChangeLegendAttribute])

  // Leaflet's invalidateSize() reads the current size of the map container <div> and then
  // caches the resulting size. Therefore, it must be called _after_ the <div> has changed
  // its size, rather than, for instance, after the layout has changed but before the change
  // has been rendered to the DOM.
  useEffect(() => {
    const mapBounds = interiorDivRef.current?.getBoundingClientRect()
    if (mapBounds) {
      const {width: prevWidth, height: prevHeight, legend: prevLegend} = prevMapSize.current
      const width = Math.round(mapBounds.width)
      const height = Math.round(mapBounds.height)
      const legend = Math.round(layout.tileHeight - layout.contentHeight)
      // if the size of the map has changed, let leaflet know about it
      if (width !== prevWidth || height !== prevHeight || legend !== prevLegend) {
        mapModel.leafletMapState.adjustMapView({invalidateSize: true, animate: legend !== prevLegend})
        // remember the current sizes for comparison
        prevMapSize.current = {width, height, legend}
      }
    }
  }) // no dependencies so it runs after every render

  const renderSliderIfAppropriate = useCallback(() => {
    if (mapModel.layers.some(layer => isMapPointLayerModel(layer) && layer.gridModel.isVisible)) {
      return <MapGridSlider mapModel={mapModel} mapRef={mapRef}/>
    }
  }, [mapModel, mapRef])

  return (
    <div className={clsx('map-container', kPortalClass)} ref={mapRef} data-testid="map">
      <div className="leaflet-wrapper" style={{height: mapHeight}} ref={interiorDivRef}>
        <MapContainer center={mapModel.center} zoom={mapModel.zoom} scrollWheelZoom={false}
                      zoomSnap={0} trackResize={true}>
          <>
            {
              BaseMapKeys.map(mapKey => {
                const url = kMapUrls[mapKey]
                const show = mapModel.baseMapLayerIsVisible && mapModel.baseMapLayerName === mapKey
                return show && <TileLayer key={mapKey} attribution={kMapAttribution} url={url}/>
              })
            }
          </>
          <MapInterior pixiPointsArrayRef={pixiPointsArrayRef}/>
        </MapContainer>
        <MapBackground mapModel={mapModel} pixiPointsArrayRef={pixiPointsArrayRef}/>
      </div>
      {renderSliderIfAppropriate()}
      <DroppableMapArea
        mapElt={mapRef.current}
        targetElt={interiorDivRef.current}
        onDropAttribute={handleChangeLegendAttribute}
      />
      <MultiLegend
        divElt={mapRef.current}
        onDropAttribute={callHandleChangeAttribute}
      />
      <MapMarqueeSelectButton mapRef={mapRef} mapModel={mapModel}/>
    </div>
  )
})
