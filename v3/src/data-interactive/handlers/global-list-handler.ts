import { appState } from "../../models/app-state"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { getGlobalValueManager } from "../../models/global/global-value-manager"
import { registerDIHandler } from "../data-interactive-handler"
import { DIGlobal, DIHandler } from "../data-interactive-types"
import { valuesFromGlobal } from "../data-interactive-type-utils"

export const diGlobalListHandler: DIHandler = {
  get() {
    const { document } = appState
    const globalManager = getGlobalValueManager(getSharedModelManager(document))
    const values: DIGlobal[] = []
    globalManager?.globals.forEach(global => values.push(valuesFromGlobal(global)))

    return {
      success: true,
      values
    }
  }
}

registerDIHandler("globalList", diGlobalListHandler)
