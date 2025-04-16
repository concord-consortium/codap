import { kComponentTypeV3ToV2Map } from "../../data-interactive/data-interactive-component-types"
import { notification } from "../../data-interactive/notification-utils"
import { toV2Id } from "../../utilities/codap-utils"
import { ITileModel } from "./tile-model"

export function createTileNotification(tile?: ITileModel) {
  if (!tile) return

  const v2Type = kComponentTypeV3ToV2Map[tile.content.type]
  const tileId = toV2Id(tile.id)
  const values = { id: tileId, type: v2Type }

  return notification("create", values, tile)
}

export function deleteTileNotification(tile?: ITileModel) {
  if (!tile) return

  const v2Type = kComponentTypeV3ToV2Map[tile.content.type]
  const tileId = toV2Id(tile.id)
  const values = { id: tileId, type: v2Type }

  return notification("delete", values, tile)
}

interface IUpdateTileNotificationValues {
  attributeName?: string
  axisOrientation?: string
  id?: number
  type?: string
}

export function updateTileNotification(updateType: string, tile?: ITileModel, values?: any) {
  if (!tile) return

  const v2Type = kComponentTypeV3ToV2Map[tile.content.type]
  const tileId = toV2Id(tile.id)
  const modifiedValues: IUpdateTileNotificationValues = {
    id: tileId,
    type: v2Type,
    ...values
  }

  return notification(updateType, modifiedValues, tile)
}
