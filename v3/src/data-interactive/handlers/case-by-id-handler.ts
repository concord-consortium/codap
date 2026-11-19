import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { deleteCaseBy, getCaseBy, moveCaseBy, updateCaseBy } from "./handler-functions"

export const diCaseByIDHandler: DIHandler = {
  delete(resources: DIResources) {
    return deleteCaseBy(resources, resources.caseByID)
  },
  get(resources: DIResources) {
    return getCaseBy(resources, resources.caseByID)
  },
  notify(resources: DIResources, values?: DIValues) {
    return moveCaseBy(resources, values, resources.caseByID, "caseByID")
  },
  update(resources: DIResources, values?: DIValues) {
    return updateCaseBy(resources, values, resources.caseByID, { nestedValues: true, resourceName: "caseByID" })
  }
}

registerDIHandler("caseByID", diCaseByIDHandler)
