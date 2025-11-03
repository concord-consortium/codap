import {LatLngBounds, latLngBounds} from 'leaflet'
import {singular} from "pluralize"
import {kPolygonNames} from "../../../models/boundaries/boundary-types"
import { IAttribute } from "../../../models/data/attribute"
import {IDataSet} from "../../../models/data/data-set"
import {isFiniteNumber} from "../../../utilities/math-utils"
import {translate} from "../../../utilities/translation/translate"
import {IDataConfigurationModel} from "../../data-display/models/data-configuration-model"
import {kLatNames, kLongNames, kPinLatNames, kPinLongNames} from "../map-types"

// A dataset has point data if it has both a latitude and longitude attribute; i.e. an attribute whose name
// is in kLatNames and an attribute whose name is in kLongNames
export const datasetHasLatLongData = (dataset: IDataSet) => {
  const attrNames = dataset.attributes.map(attr => attr.name.toLowerCase())
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

export const isBoundaryAttribute = (attribute: IAttribute) => {
  return attribute.type === "boundary" ||
          kPolygonNames.includes(attribute.name.toLowerCase()) ||
          kPolygonNames.includes(attribute.title.toLowerCase())
}

export const datasetHasBoundaryData = (dataset: IDataSet) => {
  return dataset.attributes.some(isBoundaryAttribute)
}

export const datasetHasPinData = (dataset: IDataSet) => {
  const attrNames = dataset.attributes.map(attr => attr.name.toLowerCase())
  let hasPinLatAttribute = false,
    hasPinLngAttribute = false
  while (attrNames.length > 0 && (!hasPinLatAttribute || !hasPinLngAttribute)) {
    const attrName = attrNames.pop()
    if (attrName) {
      if (kPinLatNames.includes(attrName)) {
        hasPinLatAttribute = true
      } else if (kPinLongNames.includes(attrName)) {
        hasPinLngAttribute = true
      }
    }
  }
  return hasPinLatAttribute && hasPinLngAttribute
}

// Returns the attribute IDs for the latitude and longitude attributes in the given dataset
// Throws an error if the dataset does not have both latitude and longitude attributes
export const latLongAttributesFromDataSet = (dataSet: IDataSet) => {
  const attributes = dataSet.attributes,
    latAttr = attributes.find(attr => kLatNames.includes(attr.name.toLowerCase())),
    longAttr = attributes.find(attr => kLongNames.includes(attr.name.toLowerCase()))
  if (!latAttr || !longAttr) {
    throw new Error(`Unable to find both latitude and longitude attributes in dataset ${dataSet.name}`)
  }
  return {
    latId: latAttr.id,
    longId: longAttr.id,
  }
}

export const boundaryAttributeFromDataSet = (dataSet: IDataSet) => {
  const polygonAttr = dataSet.attributes.find(isBoundaryAttribute)
  if (!polygonAttr) {
    throw new Error(`Unable to find boundary attribute in dataset ${dataSet.name}`)
  }
  return polygonAttr.id
}

export const pinAttributesFromDataSet = (dataSet: IDataSet) => {
  const attributes = dataSet.attributes,
    pinLatAttr = attributes.find(attr => kPinLatNames.includes(attr.name.toLowerCase())),
    pinLongAttr = attributes.find(attr => kPinLongNames.includes(attr.name.toLowerCase()))
  if (!pinLatAttr || !pinLongAttr) {
    throw new Error(`Unable to find both pin latitude and longitude attributes in dataset ${dataSet.name}`)
  }
  return {
    pinLatId: pinLatAttr.id,
    pinLongId: pinLongAttr.id,
  }
}

/**
 * Returns the lat/long bounds for the given data configuration
 * Todo: Currently only deals with lat/long values. Extend to work with polygons as well.
 * @param dataConfiguration
 */
export const getLatLongBounds = (dataConfiguration: IDataConfigurationModel) => {
  const getRationalLongitudeBounds = (longs: number[]) => {
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
