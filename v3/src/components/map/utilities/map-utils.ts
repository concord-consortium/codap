import {LatLngBounds, latLngBounds, Polygon} from 'leaflet'
import {isFiniteNumber} from "../../../utilities/math-utils"
import {IDataSet} from "../../../models/data/data-set"
import {kLatNames, kLongNames, kPolygonNames} from "../map-types"
import {IDataConfigurationModel} from "../../data-display/models/data-configuration-model"
import {IDataDisplayLayerModel} from "../../data-display/models/data-display-layer-model"


// A dataset has point data if it has both a latitude and longitude attribute; i.e. an attribute whose name
// is in kLatNames and an attribute whose name is in kLongNames
export const datasetHasLatLongData = (dataset: IDataSet) => {
  const attrNames = dataset.attributes.map(attr => attr.name)
  let hasLatAttribute = false,
    hasLngAttribute = false
  while (attrNames.length > 0 && (!hasLatAttribute || !hasLngAttribute)) {
    const attrName = attrNames.pop()
    if (attrName) {
      if (kLatNames.includes(attrName)) {
        hasLatAttribute = true
      } else if (kLongNames.includes(attrName)) {
        hasLngAttribute = true
      }
    }
  }
  return hasLatAttribute && hasLngAttribute
}

export const datasetHasBoundaryData = (dataset: IDataSet) => {
  const attrNames = dataset.attributes.map(attr => attr.name.toLowerCase())
  let hasBoundaryAttribute = false
  while (attrNames.length > 0 && !hasBoundaryAttribute) {
    const attrName = attrNames.pop()
    if (attrName) {
      if (kPolygonNames.includes(attrName)) {
        hasBoundaryAttribute = true
      }
    }
  }
  return hasBoundaryAttribute
}

// Returns the attribute IDs for the latitude and longitude attributes in the given dataset
// Throws an error if the dataset does not have both latitude and longitude attributes
export const latLongAttributesFromDataSet = (dataSet: IDataSet) => {
  const attributes = dataSet.attributes,
    latAttr = attributes.find(attr => kLatNames.includes(attr.name)),
    longAttr = attributes.find(attr => kLongNames.includes(attr.name))
  if (!latAttr || !longAttr) {
    throw new Error(`Unable to find both latitude and longitude attributes in dataset ${dataSet.name}`)
  }
  return {
    latId: latAttr.id,
    longId: longAttr.id,
  }
}

export const boundaryAttributeFromDataSet = (dataSet: IDataSet) => {
  const attributes = dataSet.attributes,
    polygonAttr = attributes.find(attr => kPolygonNames.includes(attr.name.toLowerCase()))
  if (!polygonAttr) {
    throw new Error(`Unable to find boundary attribute in dataset ${dataSet.name}`)
  }
  return polygonAttr.id
}

/**
 * Returns the lat/long bounds for the given data configuration
 * Todo: Currently only deals with lat/long values. Extend to work with polygons as well.
 * @param dataConfiguration
 */
export const getLatLongBounds = (dataConfiguration: IDataConfigurationModel) => {
  const getRationalLongitudeBounds = (longs: number[]) => {
      longs.sort()
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
    },

    isValid = (iMinMax: { min: number, max: number }) => {
      return isFiniteNumber(iMinMax.min) && isFiniteNumber(iMinMax.max)
    }
  const latValues = dataConfiguration.numericValuesForAttrRole('lat'),
    longValues = dataConfiguration.numericValuesForAttrRole('long')
  if (latValues.length === 0 || longValues.length === 0) {
    return undefined
  }
  const latMin = Math.min(...latValues),
    latMax = Math.max(...latValues)
  let longMin = Math.min(...longValues),
    longMax = Math.max(...longValues)
  if (longMax - longMin > 180) {
    const rationalLongs = getRationalLongitudeBounds(longValues)
    if (isValid(rationalLongs)) {
      longMin = rationalLongs.min
      longMax = rationalLongs.max
    }
  }
  const tSouthWest = {lat: latMin, lng: longMin},
    tNorthEast = {lat: latMax, lng: longMax}
  return latLngBounds([tSouthWest, tNorthEast])
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

/**
 * Fits the map bounds to the data in the given layers, some of which are point layers and some of which are polygon
 * layers.
 * @param layers
 * @param leafletMap
 */
export const fitMapBoundsToData = (layers: IDataDisplayLayerModel[], leafletMap: any) => {
  let overallBounds: LatLngBounds | undefined = undefined

  const applyBounds = (bounds: LatLngBounds | undefined) => {
    if (bounds) {
      if (overallBounds) {
        overallBounds.extend(bounds)
      } else {
        overallBounds = bounds
      }
    }
  }

  layers.forEach((layer: any) => {
    applyBounds(getLatLongBounds(layer.dataConfiguration))
  })
  leafletMap.eachLayer(function (iLayer: Polygon) {
    iLayer.getBounds && applyBounds(iLayer.getBounds())
  })
  if (overallBounds) {
    leafletMap.fitBounds(expandLatLngBounds(overallBounds, 1.1), {animate: true})
  }
}
