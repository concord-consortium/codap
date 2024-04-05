// import { t } from "../../utilities/translation/translate"
// import { symIndex, symParent } from "../../models/data/data-set-types"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"

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

    const col = dataContext.getGroupedCollection(collection.id)
    const attributes = col?.attributes ?? dataContext.ungroupedAttributes
    const cases = dataContext.getCasesWithIndeciesForCollection(collection.id).map(info => {
      const { case: c, index: caseIndex } = info
      const values: Record<string, string | number | undefined> = {}
      attributes.map(attribute => {
        if (attribute?.name) {
          values[attribute.name] = attribute?.value(caseIndex)
        }
      })
      return {
        case: {
          id: c.__id__,
          // parent: c[symParent],
          // children: 
          values
        },
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

// var serializeCase = function (iCase) {
//   var caseValues = {};
//   collection.forEachAttribute(function (attr) {
//     caseValues[attr.name] = iCase.getValue(attr.id);
//   });
//   return {
//     'case': {
//       id: iCase.id,
//       parent: (iCase.parent && iCase.parent.id),
//       children: iCase.children.map(function (child) {return child.id;}),
//       values: caseValues
//     },
//     caseIndex: collection.getCaseIndexByID(iCase.get('id'))
//   };
// }.bind(this);

registerDIHandler("allCases", diAllCasesHandler)
