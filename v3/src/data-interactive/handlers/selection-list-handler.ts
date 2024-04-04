import { IDataSet } from "../../models/data/data-set"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"

const unknownDataContextResult =
  { success: false, values: { error: t("V3.DI.Error.dataContextUnknown")} } as const
function illegalValuesResult(action: string) {
  return { success: false, values: {
    error: t("V3.DI.Error.selectionListIllegalValues", { vars: [action] })
  } } as const
}

function updateSelection(
  action: string, dataSet?: IDataSet, values?: DIValues, applySelection?: (caseIds: string[]) => void
) {
  if (!dataSet || !applySelection) return unknownDataContextResult
  if (!values || !Array.isArray(values)) return illegalValuesResult(action)

  const caseIds = values.map(value => value.toString()).filter(caseID => !!dataSet.getCase(caseID))
  // TODO Filter based on collection
  applySelection(caseIds)
  return { success: true }
}

export const diSelectionListHandler: DIHandler = {
  create(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    return updateSelection("Create", dataContext, values, dataContext?.setSelectedCases)
  },
  get(resources: DIResources) {
    const { dataContext } = resources
    if (!dataContext) return unknownDataContextResult

    const caseIds = Array.from(dataContext.selection)
    // TODO Include collectionID and collectionName
    const values = caseIds.map(caseID => ({ caseID }))
    // TODO Filter based on collection
    return {
      success: true,
      values
    }
  },
  update(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    return updateSelection("Update", dataContext, values, dataContext?.selectCases)
  }
}

// get: function (iResources) {
//   var context = iResources.dataContext;
//   var collection = iResources.collection;
//   var values = context && context.getSelectedCases().filter(function(iCase) {
//     // if we specified a collection in the get, filter by it
//     return (!collection || collection === iCase.collection);
//   }).map(function (iCase) {
//     var collectionID = iCase.getPath('collection.id');
//     var collectionName = context.getCollectionByID(collectionID).get('name');
//     return {
//       collectionID: collectionID,
//       collectionName: collectionName,
//       caseID: iCase.get('id')
//     };
//   });
//   if (!values) {
//     return {success: false, values: {error: 'Unknown context.'}};
//   }
//   return {
//     success: true,
//     values: values
//   };
// },
// /**
//  * Creates a selection list in this context. The values provided will
//  * replace the current selection list. Values are a array of case ids.
//  * @param {object} iResources
//  * @param {[number]} iValues
//  * @returns {{success: boolean}}
//  */
// create: function (iResources, iValues) {
//   if (!iResources.dataContext) {
//     return {success: false, values: {error: 'Unknown context.'}};
//   }
//   return this.doSelect(iResources, iValues, false);
// },
// /**
//  * Updates a selection list in this context. The values provided will
//  * amend the current selection list. Values are a array of case ids.
//  * @param {object}iResources
//  * @param {[number]} iValues
//  * @returns {{success: boolean}}
//  */
// update: function (iResources, iValues) {
//   if (!iResources.dataContext) {
//     return {success: false, values: {error: 'Unknown context.'}};
//   }
//   return this.doSelect(iResources, iValues, true);
// },
  // doSelect(iResources: DIResources, iValues, extend) {
  //   var context = iResources.dataContext;
  //   var collection = iResources.collection;
  //   var cases;
  //   extend = extend && iValues.length !== 0;  // No cases indicates we're not extending selection but deselecting all
  //   if (collection) {
  //     cases = iValues.map(function (caseID) {
  //       return collection.getCaseByID(caseID);
  //     }).filter(function (iCase) {return !!iCase; });
  //   } else {
  //     cases = iValues.map(function (caseID) {
  //       return context.getCaseByID(caseID);
  //     }).filter(function (iCase) {return !!iCase; });
  //   }
  //   return context.applyChange({
  //     operation: 'selectCases',
  //     collection: collection,
  //     cases: cases,
  //     select: true,
  //     extend: extend,
  //     requester: this.get('id')
  //   });
  // }

registerDIHandler("selectionList", diSelectionListHandler)
