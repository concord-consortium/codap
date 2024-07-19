// Functions used by the Collaborative plugin
// These functions would fit better in the DataSet model, but they are included in this utility file to avoid
// import cycles.

import { appState } from "../../models/app-state"
import { IDataSet } from "../../models/data/data-set"
import { kInputRowKey } from "../case-table/case-table-types"
import {
  isWebViewModel, kDefaultAllowEmptyAttributeDeletion, kDefaultPreventAttributeDeletion,
  kDefaultPreventDataContextReorg, kDefaultPreventTopLevelReorg, kDefaultRespectEditableItemAttribute
} from "./web-view-model"

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

// allowEmptyAttributeDeletion allows empty attributes to be deleted, overriding preventAttributeDeletion.
export function getAllowEmptyAttributeDeletion(dataset: IDataSet) {
  return getManagingController(dataset)?.allowEmptyAttributeDeletion ?? kDefaultAllowEmptyAttributeDeletion
}

// preventAttributeDeletion disables the Delete Attribute item from the attribute menu.
export function getPreventAttributeDeletion(dataset: IDataSet) {
  return getManagingController(dataset)?.preventAttributeDeletion ?? kDefaultPreventAttributeDeletion
}

// preventDataContextReorg prevents attributes from being dragged in a case table or the renaming of a case table
export function getPreventDataContextReorg(dataset: IDataSet) {
  return getManagingController(dataset)?.preventDataContextReorg ?? kDefaultPreventDataContextReorg
}

// preventTopLevelReorg prevents the user from modifying the parent-most child in many ways:
// - It prevents the user from dragging attributes from or into the parent collection
// - It prevents the user from adding attributes to the parent collection
//   - The add attribute in the collection titlebar is disabled
//   - The add attribute menu item in the case table ruler menu is disabled
// - It disables the index column menus in the parent collection
// - It removes the input row from the parent collection
// - It disables the add attribute button for the parent collection in the case card
export function getPreventTopLevelReorg(dataset: IDataSet) {
  return getManagingController(dataset)?.preventTopLevelReorg ?? kDefaultPreventTopLevelReorg
}

// getPreventReorg returns true when preventTopLevelReorg is true, but only for the parent-most collection
export function getPreventReorg(dataset: IDataSet, collectionId?: string) {
  const collection = dataset.getCollection(collectionId)
  return getPreventTopLevelReorg(dataset) && collection?.isTopLevel
}

// respectEditableItemAttribute affects a dataset's items in several ways, based on a special attribute named
// "__editable__". If an item's value in "__editable__" is falsy or "false", the following hold true:
// - Its cells cannot be edited.
// - It cannot be deleted using mass delete options from the trash menu.
export function getRespectEditableItemAttribute(dataset: IDataSet) {
  return getManagingController(dataset)?.respectEditableItemAttribute ?? kDefaultRespectEditableItemAttribute
}

export function isItemEditable(dataset: IDataSet, itemId: string) {
  if (!getRespectEditableItemAttribute(dataset)) return true
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
  const aCase = dataset.caseGroupMap.get(caseId)
  const itemIds = aCase?.childItemIds ?? [caseId]
  return itemIds?.every(itemId => isItemEditable(dataset, itemId))
}
