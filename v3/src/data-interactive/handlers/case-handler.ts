import { IDataSet } from "../../models/data/data-set"
import { ICaseCreation } from "../../models/data/data-set-types"
import { toV2Id, toV3CaseId } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DICaseValues, DIFullCase, DIHandler, DIResources, DIValues } from "../data-interactive-types"

// Converts an attributeName => value dictionary to attributeId => value
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

    let itemIds: string[] = []
    const newCaseData: ICaseCreation[] = []
    const cases = (Array.isArray(values) ? values : [values]) as DIFullCase[]
    dataContext.applyModelChange(() => {
      cases.forEach(aCase => {
        if (aCase.values) {
          const { parent } = aCase
          const parentValues = parent ? dataContext.getParentValues(toV3CaseId(parent)) : {}
          const caseValues = attrNamesToIds(aCase.values, dataContext)
          newCaseData.push({ ...caseValues, ...parentValues })
        }
      })
      itemIds = dataContext.addCases(newCaseData)
    })

    // TODO Include case ids as id in the returned values
    return { success: true, values: itemIds.map(id => ({ itemID: toV2Id(id) })) }
  },
  update(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    if (!dataContext) return { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } }

    const cases = (Array.isArray(values) ? values : [values]) as DIFullCase[]
    const caseIDs: number[] = []
    dataContext.applyModelChange(() => {
      cases.forEach(aCase => {
        const { id } = aCase
        const strId = id && toV3CaseId(id)
        if (id && strId && aCase.values && (dataContext.getCase(strId) || dataContext.pseudoCaseMap.get(strId))) {
          caseIDs.push(id)
          const updatedAttributes = attrNamesToIds(aCase.values, dataContext)
          dataContext.setCaseValues([{ ...updatedAttributes, __id__: strId }])
        }
      })
    })

    if (caseIDs.length > 0) return { success: true, caseIDs }

    return { success: false }
  }
}

registerDIHandler("case", diCaseHandler)
