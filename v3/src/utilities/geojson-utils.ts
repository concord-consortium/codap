export const boundaryObjectFromBoundaryValue = (iBoundaryValue: object | string) => {
  if (typeof iBoundaryValue === 'object') {
    return iBoundaryValue
  }
  else if (iBoundaryValue.startsWith('{')) // Assume it's the geojson itself
  {
    let tObject
    try {
      tObject = JSON.parse(iBoundaryValue)
    }
    catch (er) {
      console.log(er)
    }
    return {jsonBoundaryObject: tObject}
  }
  else { return null }
}

export const isBoundaryValue = (iValue: object | string): boolean => {
  let obj: any
  if (typeof iValue === "string") {
    try {
      obj = JSON.parse(iValue)
    } catch (error) {
      // If it fails to parse, it isn't a boundary
    }
  } else if (typeof iValue === "object") {
    obj = iValue as any
  }
  return obj != null &&
    (obj.geometry || obj.coordinates || obj.features ||
      obj.type === 'FeatureCollection' || obj.type === 'Feature' || obj.jsonBoundaryObject)
}
