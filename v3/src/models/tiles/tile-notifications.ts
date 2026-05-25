import {
  kComponentTypeV3ToV2Map, kV2DITypeToLifecycleNameMap, kV2DITypeToSCNameMap
} from "../../data-interactive/data-interactive-component-types"
import { notification } from "../../data-interactive/notification-utils"
import { toV2Id } from "../../utilities/codap-utils"
import { getTileContentInfo } from "./tile-content-info"
import { ITileModel } from "./tile-model"

// For V2-plugin compatibility, V2 emits the `type` field with one of two conventions
// depending on the operation:
//   - LIFECYCLE ops (create, delete, hide, show) — emitted via V2's
//     `DG.UndoHistory.makeComponentNotification(op, type)` helper — carry the lowercase
//     DI-convention name in MOST cases, but V2 sometimes uses a different lowercase name
//     for the lifecycle path (see kV2DITypeToLifecycleNameMap).
//   - OPERATIONAL ops (titleChange, calculate, edit formula, attributeChange, change
//     column width, resize column, etc.) — emitted via inline `executeNotification`
//     blocks — carry the SC class name (e.g. 'DG.Calculator', 'DG.GraphView').
// V3 mirrors V2's per-op convention so V2 plugins filtering on either form match. The
// additive `diType` field always carries the DI name regardless, so V3-aware plugins
// don't need to know V2's two conventions.
const kLifecycleOps = new Set(["create", "delete", "hide", "show"])

export const tileNotification = (
  operation: string, values: any, tile: ITileModel, callback?: (result: any) => void
) => {
  const isTitleChange = operation === "titleChange"
  const resource = isTitleChange ? `component[${toV2Id(tile.id)}]` : "component"
  // Source of truth for the DI type is `getV2Type(content)` when available — matches the
  // pattern used by component-handler / component-list-handler / data-display-handler for
  // API responses, so notifications and API responses stay consistent (e.g. a WebView
  // plugin tile resolves to `'game'` in both places).
  const diType = getTileContentInfo(tile.content.type)?.getV2Type?.(tile.content)
    ?? kComponentTypeV3ToV2Map[tile.content.type]
  const v2SCType = kV2DITypeToSCNameMap[diType]
  // V2 sometimes uses a different lifecycle-notification `type` than its DI-API type
  // (case-table → 'table'; calculator → 'calcView'). Default to the DI name.
  const v2LifecycleType = kV2DITypeToLifecycleNameMap[diType] ?? diType
  const v2Type = kLifecycleOps.has(operation) ? v2LifecycleType : v2SCType

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
