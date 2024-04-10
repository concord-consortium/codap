import { registerDIHandler } from "../data-interactive-handler"
import { DICaseValues, DIHandler, DIResources } from "../data-interactive-types"

export const diAllCasesHandler: DIHandler = {
  delete(resources: DIResources) {
    const { dataContext } = resources
    if (!dataContext) return { success: false }

    dataContext.applyUndoableAction(() => {
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

    const attributes = dataContext.getGroupedCollection(collection.id)?.attributes ??
      dataContext.ungroupedAttributes

    const cases = dataContext.getGroupsForCollection(collection.id)?.map((c, caseIndex) => {
      const id = c.pseudoCase.__id__

      const parent = dataContext.getParentCase(id, collection.id)?.pseudoCase.__id__

      // iphone-frame was throwing an error when Array.from() wasn't used here for some reason.
      const childPseudoCaseIds = c.childPseudoCaseIds && Array.from(c.childPseudoCaseIds)
      const childCaseIds = c.childCaseIds && Array.from(c.childCaseIds)
      const children = childPseudoCaseIds ?? childCaseIds ?? []

      const values: DICaseValues = {}
      const actualCaseIndex = dataContext.cases.findIndex(actualCase => actualCase.__id__ === id)
      attributes.map(attribute => {
        if (attribute?.name) {
          values[attribute.name] = c.pseudoCase[attribute.id] ?? attribute?.value(actualCaseIndex)
        }
      })

      return {
        case: { id, parent, children, values },
        caseIndex
      }
    })

    return { success: true, values: {
      collection: {
        name: collection.name,
        id: collection.id
      },
      cases
    } }
  }
}

registerDIHandler("allCases", diAllCasesHandler)
