import { IDataSet } from "../../models/data/data-set"
import { toV2Id } from "../../utilities/codap-utils"
import { DEBUG_PLUGINS, debugLog } from "../debug"

const action = "notify"
function makeCallback(operation: string, other?: any) {
  return (response: any) =>
    debugLog(DEBUG_PLUGINS, `Reply to ${action} ${operation} ${other ?? ""}`, JSON.stringify(response))
}

export function dragNotification(
  operation: string, dataSet: IDataSet, attributeId: string, _callback?: (result: any) => void,
  extraValues?: Record<string, any>
) {
  const _attribute = dataSet.getAttribute(attributeId)
  const _collection = dataSet.getCollectionForAttribute(attributeId)
  const text = _attribute?.title
  const attribute = {
    id: toV2Id(attributeId),
    name: _attribute?.name,
    title: _attribute?.title
  }
  const collection = _collection ? {
    id: toV2Id(_collection.id),
    name: _collection.name,
    title: _collection.title
  } : undefined
  const context = {
    id: toV2Id(dataSet.id),
    name: dataSet.name,
    title: dataSet.title
  }

  const resource = `dragDrop[attribute]`
  const values = { operation, text, attribute, collection, context, ...extraValues }
  const callback = _callback ?? makeCallback(operation)
  return { message: { action, resource, values }, callback }
}

export function dragStartNotification(dataSet: IDataSet, attributeId: string) {
  return dragNotification("dragstart", dataSet, attributeId)
}

export function dragEndNotification(dataSet: IDataSet, attributeId: string) {
  return dragNotification("dragend", dataSet, attributeId)
}
