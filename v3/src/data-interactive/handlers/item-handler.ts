import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIItem, DIResources, DIValues, diNotImplementedYet } from "../data-interactive-types"
import { attrNamesToIds } from "../data-interactive-utils"

const dataContextNotFoundResult = { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } } as const

export const diItemHandler: DIHandler = {
  create(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!values) return { success: false, values: { error: t("V3.DI.Error.valuesRequired") } }

    const items = (Array.isArray(values) ? values : [values]) as DIItem[]
    const itemIDs = dataContext.addCases(items.map(item => attrNamesToIds(item, dataContext)))
    return {
      success: true,
      // caseIDs, // TODO This should include all cases created, both grouped and ungrouped
      itemIDs
    }
  },
  get: diNotImplementedYet,
  update: diNotImplementedYet
}

registerDIHandler("item", diItemHandler)
