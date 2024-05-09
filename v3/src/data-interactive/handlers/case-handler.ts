import { ICaseCreation } from "../../models/data/data-set-types"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIFullCase, DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { attrNamesToIds } from "../data-interactive-utils"

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
          const parentValues = parent ? dataContext.getParentValues(parent) : {}
          const caseValues = attrNamesToIds(aCase.values, dataContext)
          newCaseData.push({ ...caseValues, ...parentValues })
        }
      })
      itemIds = dataContext.addCases(newCaseData)
    })

    // TODO Include case ids as id in the returned values
    return { success: true, values: itemIds.map(id => ({ itemID: id })) }
  },
  update(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    if (!dataContext) return { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } }

    const cases = (Array.isArray(values) ? values : [values]) as DIFullCase[]
    const caseIDs: string[] = []
    dataContext.applyModelChange(() => {
      cases.forEach(aCase => {
        const { id } = aCase
        if (id && aCase.values && (dataContext.getCase(id) || dataContext.pseudoCaseMap.get(id))) {
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
