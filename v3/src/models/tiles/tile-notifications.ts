import {
  kComponentTypeV3ToV2Map, kComponentTypeV3ToV2SCNameMap
} from "../../data-interactive/data-interactive-component-types"
import { notification } from "../../data-interactive/notification-utils"
import { toV2Id } from "../../utilities/codap-utils"
import { getTileContentInfo } from "./tile-content-info"
import { ITileModel } from "./tile-model"

// For V2-plugin compatibility, V2 emits the `type` field with one of two conventions
// depending on the operation:
//   - LIFECYCLE ops (create, delete, hide, show) — emitted via V2's
//     DG.UndoHistory.makeComponentNotification(op, type) helper — use the lowercase
//     DI-convention name (e.g. 'calculator', 'graph', 'table').
//   - OPERATIONAL ops (titleChange, calculate, edit formula, attributeChange, change
//     column width, resize column, etc.) — emitted via inline `executeNotification`
//     blocks — use the SC class name (e.g. 'DG.Calculator', 'DG.GraphView',
//     'DG.CaseTable').
// V3 mirrors this per-op convention so V2 plugins filtering on either form match. The
// additive `diType` field always carries the DI name regardless, so V3-aware plugins
// don't need to know V2's two conventions.
const kLifecycleOps = new Set(["create", "delete", "hide", "show"])

export const tileNotification = (
  operation: string, values: any, tile: ITileModel, callback?: (result: any) => void
) => {
  const isTitleChange = operation === "titleChange"
  const resource = isTitleChange ? `component[${toV2Id(tile.id)}]` : "component"
  const v2SCType = kComponentTypeV3ToV2SCNameMap[tile.content.type]
  const diType = kComponentTypeV3ToV2Map[tile.content.type]
  const v2Type = kLifecycleOps.has(operation) ? diType : v2SCType

  values.operation = operation
  values.id = toV2Id(tile.id)
  values.type = v2Type
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

// V2 emits `hide` / `show` on the component resource for singleton-component toggle
// (apps/dg/controllers/document_controller.js:1644-1666) via the
// `DG.UndoHistory.makeComponentNotification(op, type)` helper — `type` is the lowercase
// DI-convention name (e.g. `'calculator'`). The op reflects the resulting visible state:
// hiding/deleting the singleton emits `hide`; making it visible (whether newly created
// or unhidden) emits `show`. Non-singleton tiles use `create`/`delete` instead — this
// helper no-ops for them so it's safe to call from generic notify callbacks.
export function componentShowHideNotification(tile: ITileModel | undefined, op: "show" | "hide") {
  if (!tile) return
  if (!getTileContentInfo(tile.content.type)?.isSingleton) return
  return tileNotification(op, {}, tile)
}
