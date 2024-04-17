import { gDataBroker } from "../../models/data/data-broker"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIDataContext, DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { convertDataSetToV2 } from "../data-interactive-type-utils"

const contextNotFoundResult = { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } } as const

export const diDataContextHandler: DIHandler = {
  delete(resources: DIResources) {
    const { dataContext } = resources
    if (!dataContext) return contextNotFoundResult

    gDataBroker.removeDataSet(dataContext.id)
    return { success: true }
  },
  get(resources: DIResources) {
    const { dataContext } = resources
    if (!dataContext) return contextNotFoundResult

    return { success: true, values: convertDataSetToV2(dataContext) }
  },
  update(resources: DIResources, _values?: DIValues) {
    const { dataContext } = resources
    if (!dataContext) return contextNotFoundResult

    const values = _values as DIDataContext
    if (values) {
      const { metadata, title } = values
      const description = metadata?.description
      if (description) dataContext.setDescription(description)
      if (title) dataContext.setTitle(title)
    }

    return { success: true }
  }
}

registerDIHandler("dataContext", diDataContextHandler)
