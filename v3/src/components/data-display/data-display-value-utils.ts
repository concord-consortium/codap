import { convertToDate } from "../../utilities/date-utils"
import { IDataSet } from "../../models/data/data-set"

// For graphs and map legends, we need date values to be returned as numbers
export const dataDisplayGetNumericValue = (dataset: IDataSet | undefined, caseID: string, attrID: string) => {
  const attr = dataset?.getAttribute(attrID)
  const index = dataset?.getItemIndexForCaseOrItem(caseID)
  if (attr?.type === 'date' && index != null) {
    const dateInMS = convertToDate(dataset?.getStrValueAtItemIndex(index, attrID))?.valueOf()
    return dateInMS ? dateInMS / 1000 : undefined
  }
  return dataset?.getNumeric(caseID, attrID)
}
