import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIItem, DIResources, DIValues } from "../data-interactive-types"
import { attrNamesToIds } from "../data-interactive-utils"

const dataContextNotFoundResult = { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } } as const

export const diItemHandler: DIHandler = {
  create(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult

    const items = (Array.isArray(values) ? values : [values]) as DIItem[]
    const itemIDs = dataContext.addCases(items.map(item => attrNamesToIds(item, dataContext)))
    return {
      success: true,
      caseIDs: itemIDs, // TODO This should include all cases created, including ungrouped and grouped
      itemIDs
    }
  }
}

registerDIHandler("item", diItemHandler)
