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
  const isGeoJsonBoundary = (obj: any): boolean => {
    return obj && typeof obj === 'object' &&
      (obj.type === 'FeatureCollection' || obj.type === 'Feature' || obj.jsonBoundaryObject)
  }

  if (typeof iValue === 'object') {
    return isGeoJsonBoundary(iValue)
  } else {
    return iValue.startsWith('{') &&
      (iValue.includes('"geometry"') ||
      iValue.includes('"coordinates"') ||
      iValue.includes('"features"'))
  }
}
