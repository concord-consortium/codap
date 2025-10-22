import { codapResourcesUrl } from "../../constants"

export const kBoundariesRootUrl = codapResourcesUrl("boundaries")
export const kBoundariesSpecUrl = `${kBoundariesRootUrl}/default_boundary_specs.json`

// TODO: localize this list properly
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
  return obj != null && typeof obj === 'object' &&
    !!(obj.geometry || obj.coordinates || obj.features ||
      obj.type === 'FeatureCollection' || obj.type === 'Feature' || obj.jsonBoundaryObject)
}

export const checkBoundaryString = (iValue: string): [false] | [true, object] => {
  // stringified objects must be enclosed in braces
  if (iValue[0] !== '{' || iValue[iValue.length - 1] !== '}') return [false]
  const obj = boundaryObjectFromBoundaryValue(iValue)
  return obj && isBoundaryValue(obj) ? [true, obj] : [false]
}

export const isBoundaryString = (iValue: string): boolean => {
  const [isBoundary] = checkBoundaryString(iValue)
  return isBoundary
}

export const getBoundaryValueFromString = (iValue: string): Maybe<object> => {
  const [isBoundary, boundary] = checkBoundaryString(iValue)
  return isBoundary ? boundary : undefined
}

interface IBoundaryWithThumbnail {
  properties?: {
    NAME?: string
    THUMB?: string
  }
}

export const hasBoundaryThumbnail = (iBoundary?: object): iBoundary is IBoundaryWithThumbnail => {
  return iBoundary != null && typeof iBoundary === "object" &&
    "properties" in iBoundary && iBoundary.properties != null && typeof iBoundary.properties === "object" &&
    "THUMB" in iBoundary.properties
}

export interface BoundaryInfo {
  name: string
  format: string
  url: string
  promise?: Promise<unknown>
  boundary?: unknown
  error?: unknown
}
export function isBoundaryInfo(obj: any): obj is BoundaryInfo {
  return obj && typeof obj === "object" && "format" in obj && "name" in obj && "url" in obj
}
