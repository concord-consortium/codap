import React, {MutableRefObject, useCallback, useEffect, useMemo, useRef} from "react"
import {observer} from "mobx-react-lite"
import {clsx} from "clsx"
import {MapContainer, TileLayer} from "react-leaflet"
import {PixiPoints} from "../../graph/utilities/pixi-points"
import {kPortalClass} from "../../data-display/data-display-types"
import {BaseMapKeys, kMapAttribution, kMapUrls} from "../map-types"
import {GraphPlace} from "../../axis-graph-shared"
import {useForceUpdate} from "../../../hooks/use-force-update"
import {useMapModelContext} from "../hooks/use-map-model-context"
import {useDataDisplayLayout} from "../../data-display/hooks/use-data-display-layout"
import {MarqueeState} from "../../data-display/models/marquee-state"
import {Background} from "../../data-display/components/background"
import {MapInterior} from "./map-interior"
import {MultiLegend} from "../../data-display/components/legend/multi-legend"
import {DroppableMapArea} from "./droppable-map-area"
import {Marquee} from "../../data-display/components/marquee"
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
    marqueeState = useMemo<MarqueeState>(() => new MarqueeState(), []),
    pixiPointsArrayRef = useRef<PixiPoints[]>([])

  // trigger an additional render once references have been fulfilled
  useEffect(() => forceUpdate(), [forceUpdate])

  const handleChangeLegendAttribute = useCallback((dataSet: IDataSet, attrId: string) => {
    mapModel.applyUndoableAction(
      () => mapModel.setLegendAttributeID(dataSet.id, attrId),
      {
        undoStringKey: "V3.Undo.mapLegendAttributeChange",
        redoStringKey: "V3.Redo.mapLegendAttributeChange"
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

  const disableLeaflet = useCallback(() => {
    const leafletMap = mapModel.leafletMap
    if (leafletMap) {
      leafletMap.dragging.disable()
      leafletMap.touchZoom.disable()
      leafletMap.doubleClickZoom.disable()
      leafletMap.scrollWheelZoom.disable()
      leafletMap.boxZoom.disable()
      leafletMap.keyboard.disable()
    }
  }, [mapModel.leafletMap])

  const enableLeaflet = useCallback(() => {
    const leafletMap = mapModel.leafletMap
    if (leafletMap) {
      leafletMap.dragging.enable()
      leafletMap.touchZoom.enable()
      leafletMap.doubleClickZoom.enable()
      leafletMap.scrollWheelZoom.enable()
      leafletMap.boxZoom.enable()
      leafletMap.keyboard.enable()
    }
  }, [mapModel.leafletMap])

  const renderBackgroundIfAppropriate = useCallback(() => {
    if (mapModel.marqueeMode === 'selected') {
      disableLeaflet()
      mapModel.setDeselectionIsDisabled(true)
      return (
        <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: "crosshair"}}>
          <svg className="map-background-container">
            <Background
              ref={interiorDivRef}
              marqueeState={marqueeState}
              pixiPointsArrayRef={pixiPointsArrayRef}
            />
            <Marquee marqueeState={marqueeState}/>
          </svg>
        </div>
      )
    } else {
      enableLeaflet()
    }
  }, [disableLeaflet, enableLeaflet, mapModel, marqueeState])

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
        {renderBackgroundIfAppropriate()}
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
