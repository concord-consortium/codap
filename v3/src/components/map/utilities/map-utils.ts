import {IDataSet} from "../../../models/data/data-set"
import {kLatNames, kLongNames} from "../map-types"


export const datasetHasPointData = (dataset: IDataSet) => {
  const attrNames = dataset.attributes.map(attr => attr.name)
  let hasLatAttribute = false,
    hasLngAttribute = false
  while (attrNames.length > 0 && (!hasLatAttribute || !hasLngAttribute)) {
    const attrName = attrNames.pop()
    if (attrName) {
      if (kLatNames.includes(attrName)) {
        hasLatAttribute = true
      } else if (kLongNames.includes(attrName)) {
        hasLngAttribute = true
      }
    }
  }
  return hasLatAttribute && hasLngAttribute
}
