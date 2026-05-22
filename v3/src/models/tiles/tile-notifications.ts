import { kComponentTypeV3ToV2Map } from "../../data-interactive/data-interactive-component-types"
import { notification } from "../../data-interactive/notification-utils"
import { toV2Id } from "../../utilities/codap-utils"
import { ITileModel } from "./tile-model"

export const tileNotification = (
  operation: string, values: any, tile: ITileModel, callback?: (result: any) => void
) => {
  const isTitleChange = operation === "titleChange"
  const resource = isTitleChange ? `component[${toV2Id(tile.id)}]` : "component"
  const v2Type = kComponentTypeV3ToV2Map[tile.content.type]

  values.operation = operation
  values.id = toV2Id(tile.id)
  values.type = v2Type

  const result = notification(resource, values, callback)
  // V2 (apps/dg/views/component_view.js) places `type` at the outer envelope level for
  // titleChange, a peer of `action`/`resource`. Mirror it there for V2 plugins while
  // keeping `type` in `values` for consistency with every other operation.
  if (isTitleChange) (result.message as any).type = v2Type

  return result
}

export function createTileNotification(tile?: ITileModel) {
  if (!tile) return

  return tileNotification("create", {}, tile)
}

export function deleteTileNotification(tile?: ITileModel) {
  if (!tile) return

  const values = {
    name: tile.name,
    title: tile.title
  }

  return tileNotification("delete", values, tile)
}

export function updateTileNotification(updateType: string, values: any, tile?: ITileModel) {
  if (!tile) return

  return tileNotification(updateType, values, tile)
}
