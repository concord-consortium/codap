import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DICaseValues, DIFullCase, DIHandler, DIResources, DIValues } from "../data-interactive-types"

export const diCaseHandler: DIHandler = {
  // create(resources: DIResources, values: DIValues) {
  //   const { dataContext, collection } = resources
  //   if (!collection) return { success: false, values: { error: t("V3.DI.Error.collectionNotFound") } }

  //   const cases = Array.isArray(values) ? values : [values]
  // },
  update(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    if (!dataContext) return { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } }

    const cases = (Array.isArray(values) ? values : [values]) as DIFullCase[]
    const caseIDs: string[] = []
    dataContext.applyUndoableAction(() => {
      cases.forEach(aCase => {
        const { id } = aCase
        if (id && aCase.values && (dataContext.getCase(id) || dataContext.pseudoCaseMap.get(id))) {
          caseIDs.push(id)
          const updatedAttributes: DICaseValues = {}
          Object.keys(aCase.values).forEach(attrName => {
            const attrId = dataContext.attrIDFromName(attrName)
            if (attrId) {
              updatedAttributes[attrId] = aCase.values?.[attrName]
            }
          })
          dataContext.setCaseValues([{ ...updatedAttributes, __id__: id }])
        }
      })
    })

    if (caseIDs.length > 0) return { success: true, caseIDs }

    return { success: false }
  }
}

// createCases: function( iResources, iValues, iRequesterID) {

//   function convertDate( iValue) {
//     if (iValue instanceof Date) {
//       iValue.valueOf = function () {
//         return Date.prototype.valueOf.apply(this) / 1000;
//       };
//     }
//   }

//   function fixDates(iCase) {
//     if( Array.isArray( iCase.values)) {
//       iCase.values.forEach(function (iValue) {
//         convertDate( iValue);
//       });
//     }
//     else if ( typeof iCase.values === 'object') {
//       DG.ObjectMap.forEach( iCase.values, function( iKey, iValue) {
//         convertDate( iValue);
//       });
//     }
//   }

//   function createOrAppendRequest(iCase) {
//     fixDates(iCase);
//     var parent = iCase.parent;
//     var values = iCase.values;
//     var req = requests.find(function (request) {
//       return request.properties.parent === parent;
//     });
//     if (!req) {
//       req = {
//         operation: 'createCases',
//         collection: collection,
//         properties: {
//           parent: parent
//         },
//         values: [],
//         requester: requester
//       };
//       requests.push(req);
//     }
//     req.values.push(values);
//   }
//   if (!iResources.collection) {
//     return {success: false, values: {error: 'Collection not found'}};
//   }
//   // ------------------createCases-----------------
//   var success = true;
//   var context = iResources.dataContext;
//   var collection = iResources.collection;
//   var cases = Array.isArray(iValues)?iValues: [iValues];
//   var IDs = [];
//   var requester = iRequesterID;
//   var requests = [];

//   // We wish to minimize the number of change requests submitted,
//   // but create case change requests are not structured like cases.
//   // we must reformat the Plugin API create/case to some number of
//   // change requests, one for each parent referred to in the create/case
//   // object.
//   cases.forEach(createOrAppendRequest);
//   requests.forEach(function (req) {
//     var changeResult = context.applyChange(req);
//     var success = success && (changeResult && changeResult.success);
//     var index;
//     if (changeResult.success) {
//       for (index = 0; index < changeResult.caseIDs.length; index++) {
//         var caseid = changeResult.caseIDs[index];
//         var itemid = (index <= changeResult.itemIDs.length) ? changeResult.itemIDs[index] : null;
//         IDs.push({id: caseid, itemID: itemid});
//       }
//     }
//   });
//   return {success: success, values: IDs};
// },

// doCreateCases: function (iChange) {
//   function createOneCase(iValues) {
//     var properties = {};
//     var newCase;
//     if (iChange.properties) {
//       DG.ObjectMap.copy(properties, iChange.properties);
//     }
//     if (Array.isArray(iValues)) {
//       newCase = collection.createCase(properties);
//       if (newCase) {
//         collection.setCaseValuesFromArray(newCase, iValues);
//       }
//     } else {
//       properties.values = iValues;
//       newCase = collection.createCase(properties);
//     }
//     if (newCase) {
//       result.success = true;
//       result.caseIDs.push(newCase.get('id'));
//       result.itemIDs.push(newCase.item.id);
//     }
//   }

//   /**
//    * returns true if either the collection is a child collection or the parentKey
//    * resolves to an existing parent.
//    * @param parentKey {number}
//    */
//   var validateParent = function (collection, parentKey) {
//     var rslt = true;
//     var parentCollectionID = collection.getParentCollectionID();
//     if (parentCollectionID) {
//       rslt = !SC.none(this.getCaseByID(parentKey));
//       if (!rslt) {
//         DG.logWarn('Cannot create case with invalid or deleted parent: ' + parentKey);
//       }
//     }
//     return rslt;
//   }.bind(this);

//   var collection,
//       valuesArrays,
//       parentIsValid = true,
//       result = {success: false, caseIDs: [], itemIDs: []};

//   if (!iChange.collection) {
//     iChange.collection = this.get('childCollection');
//   }
//   if( !iChange.collection.casesController)
//     iChange.collection = iChange.collection.get('name');

//   if (typeof iChange.collection === "string") {
//     collection = this.getCollectionByName( iChange.collection);
//     iChange.collection = collection;  // Because we'll need it as an object later
//   } else {
//     collection = iChange.collection;
//   }

//   // we hold off on observers because of performance issues adding many
//   // cases when some cases are selected
//   collection.casesController.beginPropertyChanges();
//   try {
//     if (!iChange.properties) {
//       iChange.properties = {};
//     }

//     if (typeof iChange.properties.parent !== 'object') {
//       parentIsValid = validateParent(collection, iChange.properties.parent);
//     }
//     if (collection && parentIsValid) {
//       valuesArrays = iChange.values || [[]];
//       valuesArrays.forEach(createOneCase);
//       if (result.caseIDs && (result.caseIDs.length > 0)) {
//         result.caseID = result.caseIDs[0];
//       }
//       if (result.itemIDs && (result.itemIDs.length > 0)) {
//         result.itemID = result.itemIDs[0];
//       }
//     }
//   } finally {
//     collection.casesController.endPropertyChanges();
//   }

//   // invalidate dependents; aggregate functions may need to recalculate
//   this.invalidateAttrsOfCollections([collection], iChange);

//   return result;
// },

registerDIHandler("case", diCaseHandler)
