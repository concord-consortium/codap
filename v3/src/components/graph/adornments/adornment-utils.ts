export const updateCellKey = (cellKey: Record<string, string>, attrId: string, cat: string) => {
  const newCellKey = { ...cellKey }
  if (cat) {
    const propertyAlreadyPresent = Object.keys(newCellKey).includes(attrId)
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
