import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"
import { diComponentHandlers } from "./component-handler"
import { componentNotFoundResult } from "./di-results"

export const diDataDisplayHandler: DIHandler = {
  get(resources: DIResources) {
    const { component } = resources
    if (!component) return componentNotFoundResult

    const handler = diComponentHandlers.get("dataDisplay")
    const imgSnapshotRes = { ...handler?.get(component?.content) }
    const { exportDataUri, success } = imgSnapshotRes
    const values = success
      ? { exportDataUri }
      : { error: t("V3.DI.Error.dataDisplayNotFound") }

    return {
      success,
      values
    }
  }
}

registerDIHandler("dataDisplay", diDataDisplayHandler)
