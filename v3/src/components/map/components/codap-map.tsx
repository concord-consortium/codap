import {observer} from "mobx-react-lite"
import React, {MutableRefObject} from "react"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {LatLngExpression} from "leaflet"
import {MapContainer, TileLayer} from "react-leaflet"
import {kDefaultMapLocation, kDefaultMapZoom, kMapAttribution, kMapUrl} from "../map-types"
import {MapController} from "../models/map-controller"
import {MapInterior} from "./map-interior"
import {IDotsRef} from "../../data-display/data-display-types"

import 'leaflet/dist/leaflet.css'
import "./map.scss"

interface IProps {
  mapController: MapController
  mapRef: MutableRefObject<HTMLDivElement | null>
  dotsRef: IDotsRef
  dotsElement: SVGSVGElement | null
}

export const CodapMap = observer(function CodapMap({mapController, mapRef, dotsRef, dotsElement}: IProps) {
  const instanceId = useInstanceIdContext()

  return (
    <div className='map-container' ref={mapRef} data-testid="map">
      <MapContainer center={kDefaultMapLocation as LatLngExpression} zoom={kDefaultMapZoom} scrollWheelZoom={false}
                    zoomSnap={0} trackResize={true}>
        <TileLayer attribution={kMapAttribution} url={kMapUrl}/>
        <svg ref={dotsRef} className={`map-dot-area ${instanceId}`}>
          <MapInterior dotsElement={dotsElement} mapController={mapController}/>
        </svg>
      </MapContainer>
      {/*
          <Legend
            legendAttrID={mapModel.getAttributeID('legend')}
            mapElt={mapRef.current}
            onDropAttribute={handleChangeAttribute}
            onRemoveAttribute={handleRemoveAttribute}
            onTreatAttributeAs={handleTreatAttrAs}
          />
*/}
    </div>
  )
})
