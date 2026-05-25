import {
  kComponentTypeV3ToV2Map, kComponentTypeV3ToV2SCNameMap
} from "../../data-interactive/data-interactive-component-types"
import { notification } from "../../data-interactive/notification-utils"
import { toV2Id } from "../../utilities/codap-utils"
import { ITileModel } from "./tile-model"

export const tileNotification = (
  operation: string, values: any, tile: ITileModel, callback?: (result: any) => void
) => {
  const isTitleChange = operation === "titleChange"
  const resource = isTitleChange ? `component[${toV2Id(tile.id)}]` : "component"
  // For V2-plugin compatibility: V2 inconsistently uses SC class names (`DG.Calculator`)
  // in notification payloads but lowercase DI-convention names (`calculator`) in API
  // responses — see the note on kComponentTypeV3ToV2SCNameMap. V3 emits the SC name as
  // `type` (so V2 plugins filtering on `values.type === 'DG.X'` match) plus an additive
  // `diType` with the DI-convention name (so consumers don't have to learn V2's two
  // conventions).
  const v2SCType = kComponentTypeV3ToV2SCNameMap[tile.content.type]
  const diType = kComponentTypeV3ToV2Map[tile.content.type]

  values.operation = operation
  values.id = toV2Id(tile.id)
  values.type = v2SCType
  values.diType = diType

  const result = notification(resource, values, callback)
  // V2 (apps/dg/views/component_view.js:284) places `type` at the outer envelope level for
  // titleChange — its value is `model.type` (the SC class name), peer of `action`/`resource`.
  // Mirror it there for V2 plugins while keeping `type` and `diType` in `values`.
  if (isTitleChange) (result.message as any).type = v2SCType

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
