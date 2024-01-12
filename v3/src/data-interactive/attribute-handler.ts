import { getSnapshot } from "mobx-state-tree"
import { DIHandler, DIResources, diNotImplementedYet } from "./data-interactive-types"

export const diAttributeHandler: DIHandler = {
  get(resources: DIResources) {
    const { attribute } = resources
    return attribute
      ? {
          success: true,
          // TODO: convert to v2 format for plugins
          values: getSnapshot(attribute)
        }
      : {success: false, values: {error: 'Attribute not found'}}
  },
  create: diNotImplementedYet,
  update: diNotImplementedYet,
  delete: diNotImplementedYet
}

// from data_interactive_phone_handler.js
// create: function (iResources, iValues, iMetadata) {
//   return DG.appController.documentArchiver.createAttribute(iResources, iValues, iMetadata, this.get('id'));
// },
// update: function (iResources, iValues, iMetadata) {
//   return DG.appController.documentArchiver.updateAttribute(iResources, iValues, iMetadata);
// },
// 'delete': function (iResources, iValues, iMetadata) {
//   var iDataContext = iResources.dataContext;
//   var attr = iResources.attribute;
//   var iAttrID = attr && attr.get('id');
//   var tCollectionClient = iResources.collection;
//   var response, change;
//   if ((tCollectionClient.get('attrsController').get('length') === 1) &&
//       (iDataContext.get('collections').length !== 1) &&
//       (tCollectionClient.getAttributeByID(iAttrID))) {
//     response = iDataContext.applyChange( {
//       operation: 'deleteCollection', collection: tCollectionClient
//     });
//   } else {
//     change = {
//         operation: 'deleteAttributes',
//         collection: tCollectionClient,
//         attrs: [{id: iAttrID, attribute: attr}],
//         requester: this.get('id')
//       };
//     if (iMetadata && iMetadata.dirtyDocument === false) {
//       change.dirtyDocument = false;
//     }
//     response = iDataContext.applyChange( change);
//   }
//   iDataContext.set('flexibleGroupingChangeFlag', true);
//   var success = !!(response && response.success);
//   return {
//     success: success,
//   };
// }

// from document_helper.js
// createAttribute: function (iResources, iValues, iMetadata, iRequesterID) {
//   if (!iResources.dataContext) {
//     return {success: false, values: {error: "no context"}};
//   }
//   if (!iResources.collection) {
//     return {success: false, values: {error: 'Collection not found'}};
//   }
//   var context = iResources.dataContext;
//   var attrSpecs = SC.clone(Array.isArray(iValues) ? iValues : [iValues]);
//   if (attrSpecs.some(function(spec) { return !spec.name; })) {
//     return {success: false, values: {error: "Create attribute: name required"}};
//   }
//   attrSpecs.forEach(function(attrSpec) {
//     attrSpec.clientName = attrSpec.name;
//     attrSpec.name = context.canonicalizeName(attrSpec.name + ' ');
//   });
//   var change = {
//     operation: 'createAttributes',
//     collection: context.getCollectionByID( iResources.collection.get('id')),
//     attrPropsArray: attrSpecs,
//     requester: iRequesterID,
//     position: iResources.position
//   };
//   return this.applyChangeAndProcessResult(context, change, iMetadata);
// },
// updateAttribute: function (iResources, iValues, iMetadata) {
//   var context = iResources.dataContext;
//   if (!iResources.collection) {
//     return {success: false, values: {error: 'Collection not found'}};
//   }
//   if (!iResources.attribute) {
//     return {success: false, values: {error: 'Attribute not found'}};
//   }
//   if (!iValues.id && iResources.attribute.id)
//     iValues.id = iResources.attribute.id;
//   if (!iValues.name && iResources.attribute.name)
//     iValues.name = iResources.attribute.name;
//   else if (iValues.name) {
//     iValues.clientName = iValues.name;
//     iValues.name = context.canonicalizeName(iValues.name + ' ');
//   }
//   var change = {
//     operation: 'updateAttributes',
//     collection: iResources.collection,
//     attrPropsArray: [iValues],
//     requester: this.get('id')
//   };
//   return this.applyChangeAndProcessResult(context, change, iMetadata);
// },
