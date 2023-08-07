import {latLngBounds} from 'leaflet'
import {isFiniteNonEmpty} from "../../../utilities/math-utils"
import {IDataSet} from "../../../models/data/data-set"
import {kLatNames, kLongNames} from "../map-types"
import {IDataConfigurationModel} from "../../data-display/models/data-configuration-model"


export const datasetHasPointData = (dataset: IDataSet) => {
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

export const pointAttributesFromDataSet = (dataSet: IDataSet) => {
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
      return isFiniteNonEmpty(iMinMax.min) && isFiniteNonEmpty(iMinMax.max)
    }
  const latValues = dataConfiguration.numericValuesForAttrRole('lat'),
    longValues = dataConfiguration.numericValuesForAttrRole('long'),
    latMin = Math.min(...latValues),
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
