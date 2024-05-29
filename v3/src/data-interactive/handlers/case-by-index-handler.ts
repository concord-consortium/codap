import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { deleteCaseBy, getCaseBy, updateCaseBy } from "./case-by-handler-functions"

export const diCaseByIndexHandler: DIHandler = {
  delete(resources: DIResources) {
    return deleteCaseBy(resources, resources.caseByIndex)
  },
  get(resources: DIResources) {
    return getCaseBy(resources, resources.caseByIndex)
  },
  update(resources: DIResources, values?: DIValues) {
    return updateCaseBy(resources, values, resources.caseByIndex, { nestedValues: true, resourceName: "caseByIndex" })
  }
}

registerDIHandler("caseByIndex", diCaseByIndexHandler)
