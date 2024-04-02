import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIGlobal, DIHandler, DIResources, DIValues } from "../data-interactive-types"

export const diGlobalHandler: DIHandler = {
  get(resources: DIResources) {
    const { global } = resources
    if (!global) return { success: false, values: { error: t("V3.DI.Error.notFound") }}

    return {
      success: true,
      values: {
        name: global.name,
        value: global.value,
        id: Number(global.id)
      }
    }
  },
  update(resources: DIResources, values?: DIValues) {
    const { global } = resources
    const { value } = values as DIGlobal
    if (!global || !value) return { success: false, values: { error: t("V3.DI.Error.globalNotFound") } }

    global.applyUndoableAction(
      () => global.setValue(Number(value))
    )
    return { success: true }
  }
}

// handleGlobal: DIHandler = {
//   create: function (iResources, iValues) {
//     var g = DG.globalsController.createGlobalValue(iValues);
//     var result = SC.none(g)
//           ?{error: 'error creating global value'}
//           :{name: g.name, value: g.value, id: g.id};
//     return {success: !SC.none(g), values: result};
//   }
// }

registerDIHandler("global", diGlobalHandler)
