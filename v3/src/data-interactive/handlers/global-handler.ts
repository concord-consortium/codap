import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"

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
  }
}

// handleGlobal: DIHandler = {
//   update: function (iResources, iValues) {
//     var global = iResources.global;
//     var newValue = iValues.value;

//     if (global && !SC.none(newValue)) {
//       global.set('value', newValue);
//       return {success: true};
//     } else {
//       return {success: false, values: {error: 'missing global or value'}};
//     }
//   },
//   create: function (iResources, iValues) {
//     var g = DG.globalsController.createGlobalValue(iValues);
//     var result = SC.none(g)
//           ?{error: 'error creating global value'}
//           :{name: g.name, value: g.value, id: g.id};
//     return {success: !SC.none(g), values: result};
//   }
// }

registerDIHandler("global", diGlobalHandler)
