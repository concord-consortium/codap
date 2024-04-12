import { IDataSet } from "../../models/data/data-set"
import { ICaseCreation } from "../../models/data/data-set-types"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DICaseValues, DIFullCase, DIHandler, DIResources, DIValues } from "../data-interactive-types"

function attrNamesToIds(values: DICaseValues, dataSet: IDataSet) {
  const caseValues: ICaseCreation = {}
  Object.keys(values).forEach(attrName => {
    const attrId = dataSet.attrIDFromName(attrName)
    if (attrId) caseValues[attrId] = values?.[attrName]
  })
  return caseValues
}

export const diCaseHandler: DIHandler = {
  create(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    if (!dataContext) return { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } }

    const caseIDs: string[] = []
    const newCases: string[][] = []
    const cases = (Array.isArray(values) ? values : [values]) as DIFullCase[]
    dataContext.applyUndoableAction(() => {
      cases.forEach(aCase => {
        if (aCase.values) {
          const { parent } = aCase
          const parentValues = parent ? dataContext.getParentValues(parent) : {}
          const caseValues = attrNamesToIds(aCase.values, dataContext)
          const ids = dataContext.addCases([{ ...caseValues, ...parentValues }])
          if (ids.length > 0) {
            newCases.push([ids[0], parent ?? "noparent"])
            // const itemId = ids[0]
            // const childId = parent ? dataContext.getChildCaseWithItem(parent, itemId) : itemId
            // caseIDs.push(childId)
          }
        }
      })
      newCases.forEach(newCaseIds => {
        const [itemId, parentId] = newCaseIds
        const childId = parentId === "noparent" ? itemId : dataContext.getChildCaseWithItem(parentId, itemId)
        caseIDs.push(childId)
      })
    })
    return { success: true, values: caseIDs.map(id => ({ id })) }
  },
  update(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    if (!dataContext) return { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } }

    const cases = (Array.isArray(values) ? values : [values]) as DIFullCase[]
    const caseIDs: string[] = []
    dataContext.applyUndoableAction(() => {
      cases.forEach(aCase => {
        const { id } = aCase
        if (id && aCase.values && (dataContext.getCase(id) || dataContext.getPseudoCaseMap().get(id))) {
          caseIDs.push(id)
          const updatedAttributes = attrNamesToIds(aCase.values, dataContext)
          dataContext.setCaseValues([{ ...updatedAttributes, __id__: id }])
        }
      })
    })

    if (caseIDs.length > 0) return { success: true, caseIDs }

    return { success: false }
  }
}

registerDIHandler("case", diCaseHandler)
