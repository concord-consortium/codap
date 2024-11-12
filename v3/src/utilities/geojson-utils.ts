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
  // TODO It would be better to check strings and objects in the same way
  if (typeof iValue === "string") {
    let obj: any
    try {
      obj = JSON.parse(iValue)
    } catch (error) {
      // If it fails to parse, it isn't a boundary
    }
    return obj != null && (obj.geometry || obj.coordinates || obj.features)
  } else if (typeof iValue === "object") {
    const obj = iValue as any
    return obj.type === 'FeatureCollection' || obj.type === 'Feature' || obj.jsonBoundaryObject
  }

  return false
}
