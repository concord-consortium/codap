import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"

export const diCaseCountHandler: DIHandler = {
  get(resources: DIResources) {
    const { collection, dataContext } = resources
    if (!collection) {
      return { success: false, values: { error: "Collection not found" } }
    }
    if (!dataContext) {
      return { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } }
    }

    return {
      success: true,
      values: dataContext.getCasesForCollection(collection.id).length
    }
  }
}

registerDIHandler("caseCount", diCaseCountHandler)
