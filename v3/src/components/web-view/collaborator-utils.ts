// Functions used by the Collaborative plugin

import { appState } from "../../models/app-state"
import { IDataSet } from "../../models/data/data-set"
import {
  isWebViewModel, kDefaultPreventAttributeDeletion, kDefaultRespectEditableItemAttribute
} from "./web-view-model"

function getManagingController(dataset: IDataSet) {
  const { content } = appState.document
  const tile = content?.getTile(dataset.managingControllerId)
  if (tile && isWebViewModel(tile.content)) {
    return tile.content
  }
}

export function getPreventAttributeDeletion(dataset: IDataSet) {
  return getManagingController(dataset)?.preventAttributeDeletion ?? kDefaultPreventAttributeDeletion
}

export function getRespectEditableItemAttribute(dataset: IDataSet) {
  return getManagingController(dataset)?.respectEditableItemAttribute ?? kDefaultRespectEditableItemAttribute
}

export function isItemEditable(dataset: IDataSet, itemId: string) {
  if (!getRespectEditableItemAttribute(dataset)) return true
  const editableAttribute = dataset.getAttributeByName("__editable__")
  if (!editableAttribute) return true
  // TODO Handle editable attribute with formula
    // // evaluate formula in context of appropriate case
    // for (var aCase = iCase; aCase; aCase = aCase.get('parent')) {
    //   if (aCase.getPath('collection.id') === editableAttrRef.collection.get('id')) {
    //     var isEditable = editableAttr.evalFormula(aCase);
    //     return !!isEditable;
    //   }
    // }
  return !!dataset.getStrValue(itemId, editableAttribute.id)
}
