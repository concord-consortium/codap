import usStateBoundaries from "../boundaries/US_State_Boundaries.json"

export const kPolygonNames = ['boundary', 'boundaries', 'polygon', 'polygons', 'grenze', '境界', 'مرز']

export const boundaryObjectFromBoundaryValue = (iBoundaryValue: object | string) => {
  if (typeof iBoundaryValue === 'object') {
    return iBoundaryValue
  } else {
    try {
      return JSON.parse(iBoundaryValue)
    } catch (er) {
      return null
    }
  }
}

export const isBoundaryValue = (iValue: object | string): boolean => {
  const obj = boundaryObjectFromBoundaryValue(iValue)
  return obj != null &&
    !!(obj.geometry || obj.coordinates || obj.features ||
      obj.type === 'FeatureCollection' || obj.type === 'Feature' || obj.jsonBoundaryObject)
}

// Functions to access remote boundary data

function processBoundaries(boundaryDocument: any) {
  const dataset = boundaryDocument.contexts[0]
  const boundaryCollection = dataset.collections[0]
  const boundaries: Record<number, string> = {}
  boundaryCollection.cases.forEach((aCase: any) => boundaries[aCase.guid] = aCase.values.boundary)

  const keyCollection = dataset.collections[1]
  const _boundaryMap: Record<string, string> = {}
  keyCollection.cases.forEach((aCase: any) => _boundaryMap[aCase.values.key] = boundaries[aCase.parent])
  return _boundaryMap
}

const boundaryMap: Record<string, any> = {
  US_state_boundaries: processBoundaries(usStateBoundaries)
}

export function isBoundarySet(name?: string) {
  return name != null && !!boundaryMap[name]
}

export function lookupBoundary(document: string, key: string) {
  return boundaryMap[document]?.[key.toLowerCase()]
}
