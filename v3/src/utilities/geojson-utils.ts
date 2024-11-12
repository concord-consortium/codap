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
  let obj: any
  if (typeof iValue === "string") {
    try {
      obj = JSON.parse(iValue)
    } catch (error) {
      return false
    }
  } else if (typeof iValue === "object") {
    obj = iValue as any
  }
  return obj != null &&
    (obj.geometry || obj.coordinates || obj.features ||
      obj.type === 'FeatureCollection' || obj.type === 'Feature' || obj.jsonBoundaryObject)
}
