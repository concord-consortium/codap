import usStateBoundaries from "./US_State_Boundaries.json"

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
