import { DEBUG_PLUGINS, debugLog } from "../lib/debug"
import { ITileModel } from "../models/tiles/tile-model"
import { toV2Id } from "../utilities/codap-utils"

const action = "notify"

export const makeCallback = (operation: string, other?: any) => {
  return (response: any) =>
    debugLog(DEBUG_PLUGINS, `Reply to ${action} ${operation} ${other ?? ""}`, JSON.stringify(response))
}

export const notification = (operation: string, values: any, tile: ITileModel, _callback?: (result: any) => void) => {
  const resource = operation === "titleChange" ? `component[${toV2Id(tile.id)}]` : "component"
  values.operation = operation
  if (tile?.title && operation === "delete") values.title = tile.title
  if (tile?.name && operation === "delete") values.name = tile.name
  const callback = _callback ?? makeCallback(operation)

  return { message: { action, resource, values }, callback }
}
