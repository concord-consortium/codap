import {GeoJSONOptions, LatLng} from "leaflet"
import { logStringifiedObjectMessage, stringify } from "../../lib/log-message"

import cursorBlack from "./assets/location-marker-cursor-black.png"
import cursorBlue from "./assets/location-marker-cursor-blue.png"
import cursorBlueGray from "./assets/location-marker-cursor-bluegray.png"
import cursorGray from "./assets/location-marker-cursor-gray.png"
import cursorGreen from "./assets/location-marker-cursor-green.png"
import cursorIndigo from "./assets/location-marker-cursor-indigo.png"
import cursorMaroon from "./assets/location-marker-cursor-maroon.png"
import cursorOrange from "./assets/location-marker-cursor-orange.png"
import cursorPurple from "./assets/location-marker-cursor-purple.png"
import cursorRed from "./assets/location-marker-cursor-red.png"

export const BaseMapKeys = ['oceans', 'topo', 'streets'] as const
export type BaseMapKey = typeof BaseMapKeys[number]

export const kMapUrls: Record<BaseMapKey, string> = {
  oceans: "https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
  topo: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
  streets: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
}

export const kMapPolygonLayerType = "mapPolygonLayer"
export const kMapPointLayerType = "mapPointLayer"
export const kMapPinLayerType = "mapPinLayer"
export const kMapLayerTypes = [kMapPolygonLayerType, kMapPointLayerType, kMapPinLayerType]

export const kMapClass = "codap-map"
export const kMapClassSelector = `.${kMapClass}`

export const MapAttrRoles = ['lat', 'long', 'polygon'] as const
export type MapAttrRole = typeof MapAttrRoles[number]
export type GeoJsonObject = GeoJSON.GeoJsonObject
export interface PolygonLayerOptions extends GeoJSONOptions<any, GeoJSON.Geometry> {
  caseID: string
}

export const
  kDefaultMapWidth = 530,
  kDefaultMapHeight = 335,
  kMapAttribution = '&copy; <a href="https://static.arcgis.com/attribution/World_Topo_Map">USGS, NOAA</a>',
  kMaxZoomForFitBounds = 12,
  kDefaultMapZoomForGeoLocation = 8,
  // Constants for maps
  kDefaultMapFillOpacity = 0.5,
  kDefaultMapStrokeColor = 'white',
  kDefaultMapStrokeOpacity = 0.6,
  kMapAreaNoLegendColor = '#FF3E00',
  kMapAreaNoLegendSelectedColor = '#1a7a93',
  kMapAreaNoLegendUnselectedOpacity = 0.5,
  kMapAreaNoLegendSelectedOpacity = 0.7,
  kMapAreaWithLegendSelectedOpacity = 0.9,
  kMapAreaWithLegendUnselectedOpacity = 0.9,
  kMapAreaNoLegendSelectedBorderColor = 'black',
  kMapAreaWithLegendUnselectedBorderColor = 'white',
  kMapAreaWithLegendSelectedBorderColor = 'red',
  kMapAreaSelectedBorderWeight = 3,
  kMapAreaUnselectedBorderWeight = 2,


  kLatNames = ['latitude', 'lat', 'latitud', 'breitengrad', '緯度', 'عرض جغرافیایی'],
  kLongNames = ['longitude', 'long', 'lng', 'lon', 'longitud', 'längengrad', '経度', 'طول جغرافیایی'],

  // TODO: Translate "pin" in non-English languages.
  kPinLatNames = ['pinlatitude', 'pinlat', 'pinlatitud', 'pinbreitengrad', 'pin緯度', 'pinعرض جغرافیایی'],
  kPinLongNames = [
    'pinlongitude', 'pinlong', 'pinlng', 'pinlon', 'pinlongitud', 'pinlängengrad', 'pin経度', 'pinطول جغرافیایی'
  ],
  kPinColors = [
    '#0068EA', '#E86B11', '#16A76A', '#E40029', '#2A31A4', '#D51EFF', '#4769A1', '#800000', '#949494', '#000000'
  ],
  kPinCursors = [
    cursorBlue, cursorOrange, cursorGreen, cursorRed, cursorIndigo,
    cursorPurple, cursorBlueGray, cursorMaroon, cursorGray, cursorBlack
  ]

export const MapPlaces = ['map', 'legend'] as const
export type MapPlace = typeof MapPlaces[number]

export type LoggableMapObject = {
  center?: LatLng
  zoom?: number
}

export function logStringifiedMapMessage(message: string, args: LoggableMapObject) {
  const { center = {}, ...others } = args
  return logStringifiedObjectMessage(message, { center: stringify(center), ...others })
}
