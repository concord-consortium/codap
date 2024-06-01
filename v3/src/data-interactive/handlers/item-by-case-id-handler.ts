import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { deleteItem, getItem, updateCaseBy } from "./handler-functions"

export const diItemByCaseIDHandler: DIHandler = {
  delete(resources: DIResources) {
    const { itemByCaseID } = resources

    return deleteItem(resources, itemByCaseID)
  },

  get(resources: DIResources) {
    const { itemByCaseID } = resources

    return getItem(resources, itemByCaseID)
  },

  update(resources: DIResources, values?: DIValues) {
    const { itemByCaseID } = resources

    return updateCaseBy(resources, values, itemByCaseID, { itemReturnStyle: true, resourceName: "itemByCaseID" })
  }
}

registerDIHandler("itemByCaseID", diItemByCaseIDHandler)
