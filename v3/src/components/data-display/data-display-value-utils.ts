import { IDataSet } from "../../models/data/data-set"
import { convertToDate } from "../../utilities/date-utils"
import { extractNumeric } from "../../utilities/math-utils"

// For graphs and map legends, we need date values to be returned as numbers
export function dataDisplayGetNumericValue(dataset: Maybe<IDataSet>, caseID: string, attrID: string, extract = true) {
  const attr = dataset?.getAttribute(attrID)
  if (attr?.type === 'numeric') {
    return dataset?.getNumeric(caseID, attrID)
  }

  const strValue = dataset?.getStrValue(caseID, attrID)
  if (!strValue) return

  if (attr?.type === 'date') {
    const dateInMS = convertToDate(strValue)?.valueOf()
    return dateInMS != null ? dateInMS / 1000 : undefined
  }

  if (extract) {
    return extractNumeric(strValue)
  }
}

// the [min, max] of the attribute's numeric values (epoch seconds for dates) over the given items
// (by default, the visible items)
export function dataDisplayGetNumericExtent(
  dataSet: Maybe<IDataSet>, attrID: string, itemIds: readonly string[] = dataSet?.itemIds ?? []
): Maybe<[number, number]> {
  if (!dataSet) return
  let min = Infinity
  let max = -Infinity
  itemIds.forEach(itemId => {
    const value = dataDisplayGetNumericValue(dataSet, itemId, attrID)
    if (value != null && isFinite(value)) {
      if (value < min) min = value
      if (value > max) max = value
    }
  })
  return min <= max ? [min, max] : undefined
}
