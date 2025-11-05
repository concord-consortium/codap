import {LatLngBounds, latLngBounds} from 'leaflet'
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
