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
