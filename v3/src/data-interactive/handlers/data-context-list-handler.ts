import { toV2Id } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"

export const diDataContextListHandler: DIHandler = {
  get(resources: DIResources) {
    if (!resources.dataContextList) {
      return { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } }
    }

    return {
      success: true,
      values: resources.dataContextList.map(dataSet => {
        const id = toV2Id(dataSet.id)
        return {
          name: dataSet.name,
          guid: id,
          title: dataSet._title,
          id
        }
      })
    }
  }
}

registerDIHandler("dataContextList", diDataContextListHandler)
