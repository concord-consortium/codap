import { ITileModel } from "../../models/tiles/tile-model"
import { updateTileNotification } from "../../models/tiles/tile-notifications"
import { kGraphTileType } from "./graph-defs"
import { IAttrChangeValues } from "./models/graph-notification-utils"

// V2 emits { action:'notify', resource:'component', values:{ operation:'change background color',
// type:'DG.GraphView' } } from apps/dg/components/graph/graph_controller.js (createSetColorAndAlphaCommand,
// ~line 772) when the user picks a color in the inspector palette. V3 additionally carries `to: <color>`
// so V3-aware plugins can see the resulting color without re-querying.
// No-ops for non-graph tiles so it's safe to call from generic notify callbacks.
export function changeBackgroundColorNotification(graphTile: ITileModel | undefined, to: string) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("change background color", { to }, graphTile)
}

// V2 emits { action:'notify', resource:'component', values:{ operation:'toggle background transparency',
// type:'DG.GraphView' } } from apps/dg/components/graph/graph_controller.js (transparency-checkbox
// valueDidChange ~line 837). V3 additionally carries `to: <boolean>` for the resulting state.
// No-ops for non-graph tiles so it's safe to call from generic notify callbacks.
export function toggleBackgroundTransparencyNotification(graphTile: ITileModel | undefined, to: boolean) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("toggle background transparency", { to }, graphTile)
}

// V2 emits `add axis attribute` from apps/dg/components/graph/graph_controller.js
// (multiTargetDidAcceptDrop ~:619) when an attribute is dropped on the y-axis multi-target —
// the "+" drop zone that adds another y-axis attribute (or splits horizontally for nominal
// attributes). V3 routes drops on the `yPlus` place to this op; the richer `IAttrChangeValues`
// payload (attributeId/Name, plotType, primaryAxis, axisOrientation) is additive over V2's bare
// emission. No-ops for non-graph tiles.
export function addAxisAttributeNotification(
  graphTile: ITileModel | undefined, values: IAttrChangeValues | undefined
) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("add axis attribute", values ?? {}, graphTile)
}

// V2 emits `add 2nd axis attribute` from apps/dg/components/graph/graph_controller.js
// (y2AxisDidAcceptDrop ~:688) when an attribute is dropped on the Y2 (rightNumeric) axis,
// creating a second scatterplot axis. V3 routes drops on the `rightNumeric` place to this op
// with the richer `IAttrChangeValues` payload. No-ops for non-graph tiles.
export function add2ndAxisAttributeNotification(
  graphTile: ITileModel | undefined, values: IAttrChangeValues | undefined
) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("add 2nd axis attribute", values ?? {}, graphTile)
}
