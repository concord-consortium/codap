import {observer} from "mobx-react-lite"
import React, {createRef, MutableRefObject} from "react"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {LatLngExpression} from "leaflet"
import {MapContainer, TileLayer} from "react-leaflet"
import {kDefaultMapLocation, kDefaultMapZoom, kMapAttribution, kMapUrl} from "../map-types"
import {useMapModelContext} from "../hooks/use-map-model-context"
import {MapController} from "../models/map-controller"
import {MapInterior} from "./map-interior"
import {DroppableMapArea} from "./droppable-map-area"
import {IDataSet} from "../../../models/data/data-set"

import 'leaflet/dist/leaflet.css'
import "./map.scss"

interface IProps {
  mapController: MapController
  mapRef: MutableRefObject<HTMLDivElement | null>
}

export const CodapMap = observer(function CodapMap({mapController, mapRef}: IProps) {
  const instanceId = useInstanceIdContext(),
    mapModel = useMapModelContext(),
    interiorSvgRef = createRef<SVGSVGElement>()

  const handleAttributeDropInMap = (dataSet: IDataSet, attrId: string) => {
    mapModel.applyUndoableAction(
      () => mapModel.setLegendAttributeID(dataSet.id, attrId),
      "V3.Undo.mapLegendAttributeChange", "V3.Redo.mapLegendAttributeChange")
  }

/*
    renderLegends = () => {
      return mapModel.layers.map((layer, index) => {
        return (
          <Legend
            key={index}
            dataConfiguration={layer.dataConfiguration}
            legendAttrID={layer.dataConfiguration.attributeID('legend')}
            divElt={mapRef.current}
            onDropAttribute={handleAttributeDropInMap}
            onRemoveAttribute={handleRemoveAttribute}
            onTreatAttributeAs={handleTreatAttrAs}
          />
        )
      })
    }
*/

  return (
    <div className='map-container' ref={mapRef} data-testid="map">
      <MapContainer center={kDefaultMapLocation as LatLngExpression} zoom={kDefaultMapZoom} scrollWheelZoom={false}
                    zoomSnap={0} trackResize={true}>
        <TileLayer attribution={kMapAttribution} url={kMapUrl}/>
        <svg ref={interiorSvgRef} className={`map-dot-area ${instanceId}`}>
          <MapInterior mapController={mapController}/>
        </svg>
      </MapContainer>
      <DroppableMapArea
        mapElt={mapRef.current}
        targetElt={interiorSvgRef.current}
        onDropAttribute={handleAttributeDropInMap}
      />
      {/*{renderLegends()}*/}
    </div>
  )
})
