import { kComponentTypeV3ToV2Map } from "../../data-interactive/data-interactive-component-types"
import { notification } from "../../data-interactive/notification-utils"
import { toV2Id } from "../../utilities/codap-utils"
import { ITileModel } from "./tile-model"

export const tileNotification = (
  operation: string, values: any, tile: ITileModel, callback?: (result: any) => void
) => {
  const resource = operation === "titleChange" ? `component[${toV2Id(tile.id)}]` : "component"

  values.operation = operation
  values.id = toV2Id(tile.id)
  values.type = kComponentTypeV3ToV2Map[tile.content.type]

  return notification(resource, values, callback)
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

export function updateTileNotification(updateType: string, values?: any, tile?: ITileModel) {
  if (!tile) return

  return tileNotification(updateType, values, tile)
}
