// Functions used by plugins and other code that is affected by plugins.

import { kInputRowKey } from "../components/case-table/case-table-types"
import {
  isWebViewModel, kDefaultAllowEmptyAttributeDeletion, kDefaultBlockAPIRequests, kDefaultPreventAttributeDeletion,
  kDefaultPreventDataContextReorg, kDefaultPreventTopLevelReorg, kDefaultRespectEditableItemAttribute
} from "../components/web-view/web-view-model"
import { appState } from "../models/app-state"
import { IAttribute } from "../models/data/attribute"
import { IDataSet } from "../models/data/data-set"

// A dataset's managing controller is a plugin that has assigned its id to the dataset's managingControllerId.
// A dataset will acquire some settings from its managing controller, which generally prevent a user from
// modifying the dataset in ways described below.
function getManagingController(dataset: IDataSet) {
  const { content } = appState.document
  const tile = content?.getTile(dataset.managingControllerId)
  if (tile && isWebViewModel(tile.content)) {
    return tile.content
  }
}

export function allowAttributeDeletion(dataset: IDataSet, attribute?: IAttribute) {
  if (!preventAttributeDeletion(dataset)) return true
  const isEmpty = !attribute?.strValues?.some(value => !!value)
  return (isEmpty && allowEmptyAttributeDeletion(dataset))
}

// allowEmptyAttributeDeletion allows empty attributes to be deleted, overriding preventAttributeDeletion.
export function allowEmptyAttributeDeletion(dataset: IDataSet) {
  if (!dataset) return false
  return getManagingController(dataset)?.allowEmptyAttributeDeletion ?? kDefaultAllowEmptyAttributeDeletion
}

// blockAPIRequests prevents the API handler from processing requests while the user is editing the table.
export function blockAPIRequests(dataset?: IDataSet) {
  if (!dataset) return kDefaultBlockAPIRequests
  return getManagingController(dataset)?.blockAPIRequests ?? kDefaultBlockAPIRequests
}

// preventAttributeDeletion disables the Delete Attribute item from the attribute menu.
export function preventAttributeDeletion(dataset: IDataSet) {
  if (!dataset) return true
  return getManagingController(dataset)?.preventAttributeDeletion ?? kDefaultPreventAttributeDeletion
}

// preventDataContextReorg prevents attributes from being dragged in a case table or the renaming of a case table
export function preventDataContextReorg(dataset?: IDataSet) {
  if (!dataset) return true
  return getManagingController(dataset)?.preventDataContextReorg ?? kDefaultPreventDataContextReorg
}

// preventTopLevelReorg prevents the user from modifying the parent-most child in many ways:
// - It prevents the user from dragging attributes:
//   - from the parent collection
//   - into the parent collection
//   - to create a new parent collection
// - It prevents the user from adding attributes to the parent collection
//   - The add attribute in the collection titlebar is disabled
//   - The add attribute menu item in the case table ruler menu is disabled
// - It disables the delete attribute menu option for attributes in the parent collection
// - It disables the index column menus in the parent collection
// - It removes the input row from the parent collection
// - It disables the add attribute button for the parent collection in the case card
export function preventTopLevelReorg(dataset: IDataSet) {
  if (!dataset) return true
  return getManagingController(dataset)?.preventTopLevelReorg ?? kDefaultPreventTopLevelReorg
}

// returns true if the collection cannot be reorganized for any reason
export function preventCollectionReorg(dataset?: IDataSet, collectionId?: string) {
  if (!dataset || preventDataContextReorg(dataset)) return true
  const collection = dataset.getCollection(collectionId)
  return !collection || (preventTopLevelReorg(dataset) && collection.isTopLevel)
}

// returns true if preventTopLevelReorg is true and the given attribute is in the parent-most collection
export function preventAttributeMove(dataset?: IDataSet, attributeId?: string) {
  if (!dataset) return true
  const isTopLevel = attributeId && dataset.getCollectionForAttribute(attributeId)?.isTopLevel
  return preventTopLevelReorg(dataset) && isTopLevel
}

// respectEditableItemAttribute affects a dataset's items in several ways, based on a special attribute named
// "__editable__". If an item's value in "__editable__" is falsy or "false", the following hold true:
// - Its cells cannot be edited.
// - It cannot be deleted using mass delete options from the trash menu.
export function respectEditableItemAttribute(dataset: IDataSet) {
  return getManagingController(dataset)?.respectEditableItemAttribute ?? kDefaultRespectEditableItemAttribute
}

export function isItemEditable(dataset: IDataSet, itemId: string) {
  if (!respectEditableItemAttribute(dataset)) return true
  // TODO Only return true here if the input row's parent case is editable
  if (itemId === kInputRowKey) return true
  const editableAttribute = dataset.getAttributeByName("__editable__")
  if (!editableAttribute) return true
  const strValue = dataset.getStrValue(itemId, editableAttribute.id)
  return !!strValue && strValue.toLowerCase() !== "false"
}

// caseId can be a case or item id
export function isCaseEditable(dataset: IDataSet, caseId: string) {
  if (caseId === kInputRowKey) return true
  const aCase = dataset.caseInfoMap.get(caseId)
  const itemIds = aCase?.childItemIds ?? [caseId]
  return itemIds?.every(itemId => isItemEditable(dataset, itemId))
}
