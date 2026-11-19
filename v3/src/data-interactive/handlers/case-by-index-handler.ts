import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { deleteCaseBy, getCaseBy, moveCaseBy, updateCaseBy } from "./handler-functions"

export const diCaseByIndexHandler: DIHandler = {
  delete(resources: DIResources) {
    return deleteCaseBy(resources, resources.caseByIndex)
  },
  get(resources: DIResources) {
    return getCaseBy(resources, resources.caseByIndex)
  },
  notify(resources: DIResources, values?: DIValues) {
    return moveCaseBy(resources, values, resources.caseByIndex, "caseByIndex")
  },
  update(resources: DIResources, values?: DIValues) {
    return updateCaseBy(resources, values, resources.caseByIndex, { nestedValues: true, resourceName: "caseByIndex" })
  }
}

registerDIHandler("caseByIndex", diCaseByIndexHandler)
