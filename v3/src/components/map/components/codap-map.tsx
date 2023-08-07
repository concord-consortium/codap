import {observer} from "mobx-react-lite"
import React, {MutableRefObject} from "react"
// eslint-disable-next-line import/no-extraneous-dependencies
import {LatLngExpression} from "leaflet"
// eslint-disable-next-line import/no-extraneous-dependencies
import {MapContainer, TileLayer} from "react-leaflet"
import {IDotsRef} from "../../data-display/data-display-types"
import {kDefaultMapLocation, kDefaultMapZoom, kMapAttribution, kMapUrl} from "../map-types"
import {MapController} from "../models/map-controller"
import {MapInterior} from "./map-interior"

// eslint-disable-next-line import/no-extraneous-dependencies
import 'leaflet/dist/leaflet.css'
import "./map.scss"

interface IProps {
  mapController: MapController
  mapRef: MutableRefObject<HTMLDivElement | null>
  dotsRef: IDotsRef
}

export const CodapMap = observer(function CodapMap({mapController, mapRef, dotsRef}: IProps) {

  return (
    <div className='map-container' ref={mapRef} data-testid="map">
      <MapContainer center={kDefaultMapLocation as LatLngExpression} zoom={kDefaultMapZoom} scrollWheelZoom={false}
                    zoomSnap={0} trackResize={true}>
        <TileLayer attribution={kMapAttribution} url={kMapUrl}/>
        <MapInterior dotsRef={dotsRef} mapController={mapController} />
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
