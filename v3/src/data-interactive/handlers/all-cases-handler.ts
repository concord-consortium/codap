import { registerDIHandler } from "../data-interactive-handler"
import { getCaseValues } from "../data-interactive-utils"
import { DIHandler, DIResources } from "../data-interactive-types"
import { toV2Id } from "../../utilities/codap-utils"

export const diAllCasesHandler: DIHandler = {
  delete(resources: DIResources) {
    const { dataContext } = resources
    if (!dataContext) return { success: false }

    dataContext.applyModelChange(() => {
      dataContext.removeCases(dataContext.cases.map(c => c.__id__))
    }, {
      undoStringKey: "DG.Undo.data.deleteCases",
      redoStringKey: "DG.Redo.data.deleteCases"
    })
    return { success: true }
  },
  get(resources: DIResources) {
    const { collection, dataContext } = resources
    if (!collection || !dataContext) return { success: false }

    const cases = dataContext.getGroupsForCollection(collection.id)?.map((c, caseIndex) => {
      const id = c.pseudoCase.__id__

      const _parent = dataContext.getParentCase(id, collection.id)?.pseudoCase.__id__
      const parent = _parent ? toV2Id(_parent) : undefined

      // iphone-frame was throwing an error when Array.from() wasn't used here for some reason.
      const childPseudoCaseIds = c.childPseudoCaseIds && Array.from(c.childPseudoCaseIds)
      const childCaseIds = c.childCaseIds && Array.from(c.childCaseIds)
      const children = childPseudoCaseIds ?? childCaseIds ?? []

      const values = getCaseValues(id, collection.id, dataContext)

      return {
        case: { id: toV2Id(id), parent, children: children.map(child => toV2Id(child)), values },
        caseIndex
      }
    })

    return { success: true, values: {
      collection: {
        name: collection.name,
        id: toV2Id(collection.id)
      },
      cases
    } }
  }
}

registerDIHandler("allCases", diAllCasesHandler)
