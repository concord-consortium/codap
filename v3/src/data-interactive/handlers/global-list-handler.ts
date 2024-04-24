import { appState } from "../../models/app-state"
import { getGlobalValueManager, getSharedModelManager } from "../../models/tiles/tile-environment"
import { registerDIHandler } from "../data-interactive-handler"
import { DIGlobal, DIHandler } from "../data-interactive-types"
import { valuesFromGlobal } from "../di-conversion-utils"

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
