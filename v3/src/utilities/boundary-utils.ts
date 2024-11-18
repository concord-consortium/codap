import { observable } from "mobx"

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

const boundariesRoot = "https://codap-resources.s3.amazonaws.com/boundaries/"
const boundariesSpecUrl = `${boundariesRoot}default_boundary_specs.json`

interface boundaryInfo {
  boundary?: any
  format: string
  name: string
  url: string
}
export const boundaryMap: Record<string, any> = observable({})
export const boundaryKeys: string[] = observable([])

fetch(boundariesSpecUrl).then((boundariesResponse: Response) => {
  if (boundariesResponse.ok && boundariesResponse.headers.get("content-type")?.includes("application/json")) {
    boundariesResponse.json().then((boundariesSpecs: boundaryInfo[]) => {
      boundariesSpecs.forEach(boundariesSpec => {
        boundaryKeys.push(boundariesSpec.name)
        boundaryMap[boundariesSpec.name] = boundariesSpec
      })
    })
  }
})

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

export function isBoundarySet(name?: string) {
  return name != null && !!boundaryMap[name]
}

export function lookupBoundary(document: string, key: string) {
  if (!isBoundarySet(document)) return

  const boundaryInfo = boundaryMap[document]
  if (boundaryInfo.boundary) {
    return boundaryInfo.boundary[key.toLowerCase()]
  }

  fetch(`${boundariesRoot}${boundaryInfo.url}`).then((boundaryResponse) => {
    boundaryResponse.json().then((boundary) => {
      boundaryInfo.boundary = processBoundaries(boundary)
    })
  })
}
