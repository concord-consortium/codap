import { extractNumeric } from "../../utilities/math-utils"
import { convertToDate } from "../../utilities/date-utils"
import { IDataSet } from "../../models/data/data-set"

// For graphs and map legends, we need date values to be returned as numbers
export const dataDisplayGetNumericValue = (dataset: IDataSet | undefined,
                                           caseID: string,
                                           attrID: string,
                                           extract: boolean = true) => {
  const attr = dataset?.getAttribute(attrID)
  const index = dataset?.getItemIndexForCaseOrItem(caseID)
  if (attr?.type === 'numeric') {
    return dataset?.getNumeric(caseID, attrID)
  }
  else if (attr?.type === 'date' && index != null) {
    const dateInMS = convertToDate(dataset?.getStrValueAtItemIndex(index, attrID))?.valueOf()
    return dateInMS ? dateInMS / 1000 : undefined
  }
  else if (index != null && extract) {
    return extractNumeric(dataset?.getStrValueAtItemIndex(index, attrID))
  }
  return undefined
}
