import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { deleteCaseBy, getCaseBy, updateCaseBy } from "./case-by-handler-functions"

export const diCaseByIDHandler: DIHandler = {
  delete(resources: DIResources) {
    return deleteCaseBy(resources, resources.caseByID)
  },
  get(resources: DIResources) {
    return getCaseBy(resources, resources.caseByID)
  },
  update(resources: DIResources, values?: DIValues) {
    return updateCaseBy(resources, values, resources.caseByID)
  }
}

registerDIHandler("caseByID", diCaseByIDHandler)
