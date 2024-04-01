import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"

export const diCaseCountHandler: DIHandler = {
  get(resources: DIResources) {
    if (!resources.collection) {
      return { success: false, values: { error: "Collection not found" } }
    }
    if (!resources.dataContext) {
      return { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } }
    }

    return {
      success: true,
      values: resources.dataContext.getCasesForCollection(resources.collection.id).length
    }
  }
}

registerDIHandler("caseCount", diCaseCountHandler)

// handleCaseCount: DIHandler = {
//   get: function (iResources) {
//     if (!iResources.collection) {
//       return {success: false, values: {error: 'Collection not found'}};
//     }

//     var count = iResources.collection.casesController.length();
//     return {
//       success: true,
//       values: count
//     };
//   }
// }
