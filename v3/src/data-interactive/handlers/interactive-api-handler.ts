import { registerDIHandler } from "../data-interactive-handler"
import { DIAsyncHandler, DIResources } from "../data-interactive-types"

export const diInteractiveApiHandler: DIAsyncHandler = {
  async get(resources: DIResources) {

    // check whether interactiveApi is enabled by looking for the interactiveApi param
    // note: the value can be blank, so we check for null specifically
    const interactiveApi = new URLSearchParams(location.search).get("interactiveApi")
    if (interactiveApi === null) {
      return {
        success: true,
        values: {
          available: false,
          notAvailableReason: "The interactiveApi parameter is not present in the URL."
        }
      }
    }

    // This is kind of hacky but we need to "reach into" the CFM to get the initInteractive message from the
    // interactiveApi provider.  The initInteractivePromise is not defined for all providers so we need to
    // cast to any to avoid TypeScript errors.  The actual value returned is just an object so we type it as
    // any as well since we are just passing it through.
    const { cfm } = resources
    const initInteractivePromise = (cfm?.client.providers.interactiveApi as any)?.initInteractivePromise as Promise<any>

    if (!initInteractivePromise) {
      return {
        success: true,
        values: {
          available: false,
          notAvailableReason: "The interactiveApi is not available."
        }
      }
    }
    const initInteractive = await initInteractivePromise

    return {
      success: true,
      values: {
        available: true,
        initInteractive
      }
    }
  },
}

registerDIHandler("interactiveApi", diInteractiveApiHandler)
