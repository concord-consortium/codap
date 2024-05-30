import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { deleteItem, getItem, updateCaseBy } from "./handler-functions"

export const diItemByIDHandler: DIHandler = {
  delete(resources: DIResources) {
    const { itemByID } = resources

    return deleteItem(resources, itemByID)
  },

  get(resources: DIResources) {
    const { itemByID } = resources

    return getItem(resources, itemByID)
  },

  update(resources: DIResources, values?: DIValues) {
    const { itemByID } = resources

    return updateCaseBy(resources, values, itemByID, { resourceName: "itemByID" })
  }
}

registerDIHandler("itemByID", diItemByIDHandler)
