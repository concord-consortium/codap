// import { registerDIHandler } from "../data-interactive-handler"
// import { DIGlobal, DIHandler, DIResources, DIValues } from "../data-interactive-types"

// export const diGlobalListHandler: DIHandler = {
//   get(resources: DIResources) {
//     const { global } = resources
//     if (!global) return { success: false, values: { error: t("V3.DI.Error.notFound") }}

//     return {
//       success: true,
//       values: valuesFromGlobal(global)
//     }
//   }
// }

// registerDIHandler("globalList", diGlobalListHandler)
