import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"

export const diItemCountHandler: DIHandler = {
  get(resources: DIResources) {
    const { dataContext } = resources
    if (!dataContext) return { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } }
    return { success: true, values: dataContext.cases.length }
  }
}

registerDIHandler("itemCount", diItemCountHandler)
