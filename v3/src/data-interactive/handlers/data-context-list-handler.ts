import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"

export const diDataContextListHandler: DIHandler = {
  get(resources: DIResources) {
    if (!resources.dataContextList) {
      return { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } }
    }

    return { success: true, values: resources.dataContextList.map(dataSet => ({
      name: dataSet.name,
      guid: Number(dataSet.id), // TODO: This is wrong and there is no current equivalent to guid in v3
      title: dataSet.name, // TODO: DataSets don't have titles in v3
      id: Number(dataSet.id) // TODO: This is wrong and there is no current equivalent to v2's id in v3
    }))}
  }
}

registerDIHandler("dataContextList", diDataContextListHandler)
