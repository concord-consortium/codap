import React, {MutableRefObject, useCallback, useEffect, useRef} from "react"
import {reaction} from "mobx"
import {observer} from "mobx-react-lite"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {clsx} from "clsx"
import {LatLngExpression} from "leaflet"
import {MapContainer, TileLayer} from "react-leaflet"
import {kPortalClass} from "../../data-display/data-display-types"
import {kDefaultMapLocation, kDefaultMapZoom, kMapAttribution, kMapUrl} from "../map-types"
import {GraphPlace} from "../../axis-graph-shared"
import {useMapModelContext} from "../hooks/use-map-model-context"
import {useDataDisplayLayout} from "../../data-display/hooks/use-data-display-layout"
import {MapInterior} from "./map-interior"
import {MultiLegend} from "../../data-display/components/legend/multi-legend"
import {DroppableMapArea} from "./droppable-map-area"
import {IDataSet} from "../../../models/data/data-set"

import 'leaflet/dist/leaflet.css'
import "./map.scss"

interface IProps {
  mapRef: MutableRefObject<HTMLDivElement | null>
}

export const CodapMap = observer(function CodapMap({mapRef}: IProps) {
  const instanceId = useInstanceIdContext(),
    mapModel = useMapModelContext(),
    layout = useDataDisplayLayout(),
    legendHeight = layout?.computedBounds?.legend?.height ?? 0,
    mapHeight = layout?.tileHeight - legendHeight,
    interiorSvgRef = useRef<SVGSVGElement>(null)

  const handleChangeLegendAttribute = useCallback((dataSet: IDataSet, attrId: string) => {
    mapModel.applyUndoableAction(
      () => mapModel.setLegendAttributeID(dataSet.id, attrId),
      "V3.Undo.mapLegendAttributeChange", "V3.Redo.mapLegendAttributeChange")
  }, [mapModel])
  const callHandleChangeAttribute = useCallback((_place: GraphPlace, dataSet: IDataSet, attrId: string) => {
    handleChangeLegendAttribute(dataSet, attrId)
  }, [handleChangeLegendAttribute])

  useEffect(() => {
    const disposer = reaction(
      () => {
        return [mapModel?.leafletMap, layout.getComputedBounds('legend')]
      },
      () => {
        mapModel?.leafletMap?.invalidateSize(true)
      }, {name: "codap-map-legend-size-change"}
    )
    return () => disposer()
  }, [mapModel?.leafletMap, legendHeight, layout])

  useEffect(() => {
    mapModel?.leafletMap?.invalidateSize()
  }, [mapHeight, mapModel?.leafletMap])

  return (
    <div className={clsx('map-container', kPortalClass)} ref={mapRef} data-testid="map">
      <div style={{height: mapHeight}}>
        <MapContainer center={kDefaultMapLocation as LatLngExpression} zoom={kDefaultMapZoom} scrollWheelZoom={false}
                      zoomSnap={0} trackResize={true}>
          <TileLayer attribution={kMapAttribution} url={kMapUrl}/>
          <svg ref={interiorSvgRef} className={`map-dot-area ${instanceId}`}>
            <MapInterior/>
          </svg>
        </MapContainer>
      </div>
      <DroppableMapArea
        mapElt={mapRef.current}
        targetElt={interiorSvgRef.current}
        onDropAttribute={handleChangeLegendAttribute}
      />
      <MultiLegend
        divElt={mapRef.current}
        onDropAttribute={callHandleChangeAttribute}
      />
    </div>
  )
})
