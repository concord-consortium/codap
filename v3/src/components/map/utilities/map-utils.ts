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

// Normalize a longitude to the canonical [-180, 180] range so that inputs like
// 200° (= -160°) are treated identically to their canonical equivalents.
// In-range values are returned as-is to avoid floating-point drift from the
// modulo arithmetic. Callers must pre-filter non-finite inputs: ±Infinity falls
// into the modulo branch and produces NaN.
const canonicalizeLongitude = (lng: number) => {
  if (lng >= -180 && lng <= 180) return lng
  return ((lng + 180) % 360 + 360) % 360 - 180
}

/**
 * Finds the smallest contiguous longitude arc that contains every input value,
 * accounting for the international date line and inputs outside [-180, 180].
 *
 * The arc is the complement of the largest cyclic gap between consecutive
 * (sorted, canonicalized) longitudes. When the largest gap straddles the date
 * line, the returned arc is the simple sorted min/max; otherwise the returned
 * `max` exceeds 180° to represent an arc that wraps east across the date line.
 *
 * Callers that render data on top of a Leaflet map should use
 * `shiftLongitudeIntoView` when projecting point coordinates so that points
 * in the canonical world copy still render inside a dateline-crossing view.
 */
export const getRationalLongitudeBounds = (longs: number[]) => {
  const sorted: number[] = []
  let canonMin = Infinity, canonMax = -Infinity
  for (const lng of longs) {
    if (isFiniteNumber(lng)) {
      const canon = canonicalizeLongitude(lng)
      sorted.push(canon)
      if (canon < canonMin) canonMin = canon
      if (canon > canonMax) canonMax = canon
    }
  }
  const n = sorted.length
  if (n === 0) return {min: NaN, max: NaN}
  if (n === 1) return {min: sorted[0], max: sorted[0]}
  // Fast path: when the canonical span is within 180°, the wrap gap (360 - span)
  // necessarily exceeds every interior gap, so the smallest enclosing arc is just
  // the canonical min/max. Skip the O(n log n) sort entirely. This also mirrors
  // V2, which only invoked the date-line algorithm when the span exceeded 180°.
  if (canonMax - canonMin <= 180) return {min: canonMin, max: canonMax}
  sorted.sort((a, b) => a - b)
  let maxGap = -Infinity, maxGapIdx = 0
  for (let i = 0; i < n - 1; i++) {
    const gap = sorted[i + 1] - sorted[i]
    if (gap > maxGap) {
      maxGap = gap
      maxGapIdx = i
    }
  }
  // Gap from the easternmost point east across the date line back to the westernmost.
  const wrapGap = (sorted[0] + 360) - sorted[n - 1]
  if (wrapGap >= maxGap) {
    return {min: sorted[0], max: sorted[n - 1]}
  }
  return {min: sorted[maxGapIdx + 1], max: sorted[maxGapIdx] + 360}
}

/**
 * Shifts a longitude to the 360° world copy nearest the [west, east] viewport.
 * This lets a point at a canonical longitude render inside a dateline-crossing
 * map view (where the viewport's east bound may exceed 180°): the nearest copy is
 * the one inside the viewport when the point is reachable, otherwise the closest
 * copy, so the point renders just off-screen rather than a full turn away.
 *
 * Must pick the *nearest* copy, not the first copy inside the bounds. CODAP-1384
 * introduced a Math.ceil version (modeled on V2's point projection) and applied it
 * to connecting-line coordinates too — but a point a fraction of a degree outside a
 * normal viewport was flung a whole 360° away, projecting to ~±infinity pixels and
 * mangling the lines (CODAP-1412). V2 itself avoided this: it shifted only point
 * circles (where an off-screen point is invisible anyway) and drew connecting lines
 * from the raw, unshifted longitude.
 */
export const shiftLongitudeIntoView = (lng: number, west: number, east: number) => {
  // A longitude already in view never needs shifting. This also avoids a tie at the
  // antimeridian: in a whole-world view [-180, 180] the rounding below would otherwise
  // map -180 to 180 (Math.round(0.5) === 1) and split lines crossing the dateline.
  if (lng >= west && lng <= east) return lng
  const center = (west + east) / 2
  return lng + Math.round((center - lng) / 360) * 360
}

/**
 * Computes LatLngBounds from arrays of latitude and longitude values,
 * handling the international date line and longitude values outside [-180, 180].
 */
export const computeBoundsFromCoordinates = (lats: number[], lngs: number[]): LatLngBounds | undefined => {
  if (lats.length === 0 || lngs.length === 0) {
    return undefined
  }
  // Use a for loop instead of Math.min/max(...array) to avoid call stack overflow with large arrays
  let latMin = Infinity, latMax = -Infinity
  for (const lat of lats) { if (lat < latMin) latMin = lat; if (lat > latMax) latMax = lat }
  if (!isFiniteNumber(latMin) || !isFiniteNumber(latMax)) return undefined
  const lngBounds = getRationalLongitudeBounds(lngs)
  if (!isFiniteNumber(lngBounds.min) || !isFiniteNumber(lngBounds.max)) return undefined
  return latLngBounds([{lat: latMin, lng: lngBounds.min}, {lat: latMax, lng: lngBounds.max}])
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

/**
 * Shifts a LatLngBounds by whole 360° world copies so its center longitude lands in the
 * canonical [-180, 180] range. computeBoundsFromCoordinates can return a compact
 * dateline-crossing arc whose east edge exceeds 180° (e.g. ~[172, 293] for US data that
 * includes Alaska's Aleutians). Point layers cope with such an arc by shifting each point
 * into the viewport via shiftLongitudeIntoView, but polygon (boundary) features render once
 * at their raw canonical coordinates and never shift. Fitting the map to an east>180° box
 * therefore parks the viewport a world copy east of the polygons, leaving the map blank.
 * Keeping the fitted center canonical positions the viewport over the world copy where the
 * polygons are actually drawn. This is a no-op for an already-canonical center, and for
 * dateline-crossing data it only changes which (geographically identical) world copy the map
 * centers on, so point rendering is unaffected.
 */
export const wrapBoundsToCanonicalCenter = (bounds: LatLngBounds): LatLngBounds => {
  const west = bounds.getWest(), east = bounds.getEast(), centerLng = (west + east) / 2
  if (centerLng >= -180 && centerLng <= 180) return bounds
  const shift = -Math.round(centerLng / 360) * 360
  return latLngBounds([
    {lat: bounds.getSouth(), lng: west + shift},
    {lat: bounds.getNorth(), lng: east + shift}
  ])
}

export const expandLatLngBounds = (bounds: LatLngBounds, fraction: number) => {
  const center = bounds.getCenter(),
    latDelta = bounds.getNorth() - bounds.getSouth(),
    lngDelta = bounds.getEast() - bounds.getWest(),
    newLatDelta = latDelta * fraction,
    // Once the longitude arc spans the full globe, further expansion would
    // wrap past the original bounds and confuse Leaflet's fitBounds.
    newLngDelta = Math.min(lngDelta * fraction, 360),
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
