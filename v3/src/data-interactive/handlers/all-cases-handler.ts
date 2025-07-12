import { IValueType } from "../../models/data/attribute-types"
import { maybeToV2Id, toV2Id } from "../../utilities/codap-utils"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"
import { collectionNotFoundResult, dataContextNotFoundResult } from "./di-results"

export const diAllCasesHandler: DIHandler = {
  delete(resources: DIResources) {
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult

    dataContext.applyModelChange(() => {
      dataContext.removeCases(dataContext.items.map(c => c.__id__))
    }, {
      undoStringKey: "DG.Undo.data.deleteCases",
      redoStringKey: "DG.Redo.data.deleteCases",
      log: {message: "Delete all cases", args: {}, category: "data"}
    })
    return { success: true }
  },
  get(resources: DIResources) {
    const { collection, dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!collection) return collectionNotFoundResult

    const attributes = collection.attributes ?? []

    const cases = dataContext.getCasesForCollection(collection.id).map(({ __id__ }, index) => {
      const pseudoCase = dataContext.caseInfoMap.get(__id__)
      const parentCase = dataContext.getParentCaseInfo(__id__, collection.id)
      const parent = maybeToV2Id(parentCase?.groupedCase.__id__)
      const children: number[] = []
      if (pseudoCase) {
        children.push(...(pseudoCase.childCaseIds ?? []).map(childId => toV2Id(childId)))
      }
      const values: Record<string, IValueType> = {}
      attributes.forEach(attr => {
        if (attr) values[attr.name] = dataContext.getValue(__id__, attr.id)
      })
      return {
        case: { id: toV2Id(__id__), parent, children, values },
        caseIndex: index
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
