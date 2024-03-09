import { isAttributeType } from "../../models/data/attribute"
import { withoutUndo } from "../../models/history/without-undo"
import { getSharedCaseMetadataFromDataset } from "../../models/shared/shared-data-utils"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues, diNotImplementedYet } from "../data-interactive-types"

function convertAttributeToV2(resources: DIResources) {
  const { attribute, dataContext } = resources
  const metadata = (dataContext && getSharedCaseMetadataFromDataset(dataContext))
  if (attribute) {
    const { name, type, title, description, editable, id, precision } = attribute
    return {
      name,
      type, // TODO This won't return "none", which v2 sometimes does
      title,
      // cid: self.cid, // TODO What should this be?
      // defaultMin: self.defaultMin, // TODO Where should this come from?
      // defaultMax: self.defaultMax, // TODO Where should this come from?
      description,
      // _categoryMap: self.categoryMap, // TODO What is this?
      // blockDisplayOfEmptyCategories: self.blockDisplayOfEmptyCategories, // TODO What?
      editable,
      hidden: (attribute && metadata?.hidden.get(attribute.id)) ?? false,
      renameable: true, // TODO What should this be?
      deleteable: true, // TODO What should this be?
      formula: attribute.formula?.display,
      // deletedFormula: self.deletedFormula, // TODO What should this be?
      guid: attribute.id, // TODO This is different than v2
      id, // TODO This is different than v2
      precision,
      unit: attribute.units
    }
  }
}

const attributeNotFoundResult = {success: false, values: {error: t("V3.DI.Error.attributeNotFound")}} as const
export const diAttributeHandler: DIHandler = {
  get(resources: DIResources) {
    const attribute = convertAttributeToV2(resources)
    if (attribute) {
      return {
        success: true,
        values: attribute
      }
    }
    return attributeNotFoundResult
  },
  create: diNotImplementedYet,
  update(resources: DIResources, values?: DIValues) {
    const { attribute } = resources
    if (!attribute) return attributeNotFoundResult
    attribute.applyUndoableAction(() => {
      withoutUndo()
      if (values?.description !== undefined) attribute.setDescription(values.description)
      if (values?.editable !== undefined) attribute.setEditable(values.editable)
      if (values?.formula !== undefined) attribute.setDisplayExpression(values.formula)
      if (values?.name !== undefined) attribute.setName(values.name)
      if (values?.precision !== undefined) attribute.setPrecision(values.precision)
      if (values?.title !== undefined) attribute.setTitle(values.title)
      if (values?.type && isAttributeType(values.type)) attribute.setUserType(values.type)
      if (values?.unit !== undefined) attribute.setUnits(values.unit)
    }, "", "")
    const attributeV2 = convertAttributeToV2(resources)
    if (attributeV2) {
      return {
        success: true,
        values: {
          attrs: [
            attributeV2
          ]
        }
      }
    }
    return attributeNotFoundResult
  },
  delete: diNotImplementedYet
}

registerDIHandler("attribute", diAttributeHandler)

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
