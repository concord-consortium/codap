import {LatLngBounds, latLngBounds, Map as LeafletMap} from 'leaflet'
import {singular} from "pluralize"
import {kPolygonNames} from "../../../models/boundaries/boundary-types"
import { IAttribute } from "../../../models/data/attribute"
import {IDataSet} from "../../../models/data/data-set"
import {isFiniteNumber} from "../../../utilities/math-utils"
import {translate} from "../../../utilities/translation/translate"
import {IDataConfigurationModel} from "../../data-display/models/data-configuration-model"

export const isBoundaryAttribute = (attribute: IAttribute) => {
  return attribute.type === "boundary" ||
          kPolygonNames.includes(attribute.name.toLowerCase()) ||
          kPolygonNames.includes(attribute.title.toLowerCase())
}

/**
 * Finds the smallest contiguous longitude range by adjusting for
 * date line crossing. Sorts and mutates the input array.
 */
export const getRationalLongitudeBounds = (longs: number[]) => {
  longs.sort((v1: number, v2: number) => (v1 - v2))
  let tLength = longs.length,
    tMin = longs[0],
    tMax = longs[tLength - 1],
    tMedian
  while (tMax - tMin > 180) {
    tMin = Math.min(tMin, longs[0])
    tMax = Math.max(tMax, longs[tLength - 1])
    tMedian = longs[Math.floor(tLength / 2)]
    if (tMax - tMedian > tMedian - tMin) {
      tMax -= 360
      if (tMax < longs[tLength - 2]) {
        tMin = Math.min(tMin, tMax)
        tMax = longs[tLength - 2]
        longs.pop()
      }
    } else {
      tMin += 360
      if (tMin > longs[1]) {
        tMax = Math.max(tMax, tMin)
        tMin = longs[1]
        longs.shift()
      }
    }
    tLength = longs.length
    if (tMax < tMin) {
      const tTemp = tMax
      tMax = tMin
      tMin = tTemp
    }
  }
  return {min: tMin, max: tMax}
}

/**
 * Computes LatLngBounds from arrays of latitude and longitude values,
 * handling the international date line when longitude values span > 180°.
 */
export const computeBoundsFromCoordinates = (lats: number[], lngs: number[]): LatLngBounds | undefined => {
  if (lats.length === 0 || lngs.length === 0) {
    return undefined
  }
  // Use reduce instead of Math.min/max(...array) to avoid call stack overflow with large arrays
  let latMin = Infinity, latMax = -Infinity, lngMin = Infinity, lngMax = -Infinity
  for (const lat of lats) { if (lat < latMin) latMin = lat; if (lat > latMax) latMax = lat }
  for (const lng of lngs) { if (lng < lngMin) lngMin = lng; if (lng > lngMax) lngMax = lng }
  if (lngMax - lngMin > 180) {
    const rationalLngs = getRationalLongitudeBounds([...lngs])
    if (isFiniteNumber(rationalLngs.min) && isFiniteNumber(rationalLngs.max)) {
      lngMin = rationalLngs.min
      lngMax = rationalLngs.max
    }
  }
  return latLngBounds([{lat: latMin, lng: lngMin}, {lat: latMax, lng: lngMax}])
}

/**
 * Returns the lat/long bounds for the given data configuration.
 * Handles point lat/long data only; polygon bounds are handled separately
 * in the map content model's latLongBounds getter.
 */
export const getLatLongBounds = (dataConfiguration: IDataConfigurationModel) => {
  const latValues = dataConfiguration.numericValuesForAttrRole('lat'),
    longValues = dataConfiguration.numericValuesForAttrRole('long')
  return computeBoundsFromCoordinates(latValues, longValues)
}

/**
 * Collects all longitude values from polygon vertices on the given Leaflet map
 * into the provided array. Recursively traverses layer groups and flattens
 * nested coordinate arrays.
 */
export const collectPolygonVertexLngs = (leafletMap: LeafletMap | undefined, lngs: number[]) => {
  const collectFromLayer = (layer: any) => {
    if (typeof layer.getLayers === 'function') {
      layer.getLayers().forEach((child: any) => collectFromLayer(child))
    }
    if (typeof layer.getLatLngs === 'function') {
      const flatten = (items: any[]) => {
        for (const item of items) {
          if (item != null && typeof item.lat === 'number' && typeof item.lng === 'number') {
            lngs.push(item.lng)
          } else if (Array.isArray(item)) {
            flatten(item)
          }
        }
      }
      flatten(layer.getLatLngs())
    }
  }
  leafletMap?.eachLayer((layer: any) => collectFromLayer(layer))
}

export const expandLatLngBounds = (bounds: LatLngBounds, fraction: number) => {
  const center = bounds.getCenter(),
    latDelta = bounds.getNorth() - bounds.getSouth(),
    lngDelta = bounds.getEast() - bounds.getWest(),
    newLatDelta = latDelta * fraction,
    newLngDelta = lngDelta * fraction,
    southWest = {lat: center.lat - newLatDelta / 2, lng: center.lng - newLngDelta / 2},
    northEast = {lat: center.lat + newLatDelta / 2, lng: center.lng + newLngDelta / 2}
  return latLngBounds([southWest, northEast])
}

export const getCaseCountString = (dataset: IDataSet, latLngAttrID: string, numCases: number) => {
  const collectionName = (dataset.getCollectionForAttribute(latLngAttrID)?.name ??
    translate('DG.DataContext.pluralCaseName')) || (dataset.name ?? '')
  const caseName = numCases === 1 ? singular(collectionName) : collectionName
  return translate('DG.DataContext.caseCountString', {vars: [numCases, caseName]})
}

export const getCategoryBreakdownHtml = (dataset: IDataSet, iCases: string[], iLegendAttrID: string) => {
  const tCategories: { [key: string]: number } = {}
  let tTotalCount = 0,
    tResult = ''
  iCases.forEach((iCase) => {
    const tValue = dataset.getStrValue(iCase, iLegendAttrID)
    if (tValue) {
      tTotalCount++
      if (!tCategories[tValue]) {
        tCategories[tValue] = 0
      }
      tCategories[tValue]++
    }
  })
  Object.entries(tCategories).forEach(([cat, count]) => {
    tResult += `<p>${cat}: ${count} (${(count / tTotalCount * 100).toFixed(1)}%)</p>`
  })
  return tResult
}
