import { INumericAxisModel } from "../../axis/models/axis-model"

export function getAxisDomains(xAxis?: INumericAxisModel, yAxis?: INumericAxisModel) {
  // establishes access to the specified axis domains for purposes of MobX observation
  const { domain: xDomain = [0, 1] } = xAxis || {}
  const { domain: yDomain = [0, 1] } = yAxis || {}
  return { xDomain, yDomain }
}

export const updateCellKey = (cellKey: Record<string, string>, attrId: string, cat: string) => {
  const newCellKey = { ...cellKey }
  if (cat) {
    const propertyAlreadyPresent = Object.prototype.hasOwnProperty.call(newCellKey, attrId)
    if (propertyAlreadyPresent && newCellKey[attrId] !== cat) {
      // When the same attribute appears on multiple axes or splits, we avoid overwriting the existing key's
      // value by using the new key "__IMPOSSIBLE__" since it's impossible for a single case to have two
      // different values for the same attribute.
      newCellKey.__IMPOSSIBLE__ = cat
    } else {
      newCellKey[attrId] = cat
    }
  }
  return newCellKey
}
