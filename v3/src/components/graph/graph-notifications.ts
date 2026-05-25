import { ITileModel } from "../../models/tiles/tile-model"
import { updateTileNotification } from "../../models/tiles/tile-notifications"
import { GraphPlace } from "../axis-graph-shared"
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

// V2 emits `toggle NumberToggle` and `toggle MeasuresForSelection` from
// apps/dg/components/graph/graph_model.js (`toggleCapability` closure ~:511), reached via
// the inspector hide/show menu items. The op string is interpolated from the capability
// name (`'toggle ' + iCapability`); V2's payload is bare. V3 additionally carries
// `to: <boolean>` for the resulting enabled state. No-ops for non-graph tiles.
export function toggleNumberToggleNotification(graphTile: ITileModel | undefined, to: boolean) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("toggle NumberToggle", { to }, graphTile)
}

export function toggleMeasuresForSelectionNotification(graphTile: ITileModel | undefined, to: boolean) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("toggle MeasuresForSelection", { to }, graphTile)
}

// V2 emits `drag movable point` from apps/dg/components/graph/adornments/movable_point_adornment.js
// (endDrag ~:128) when a user finishes dragging the scatterplot movable point. Bare payload.
// No-ops for non-graph tiles.
export function dragMovablePointNotification(graphTile: ITileModel | undefined) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("drag movable point", {}, graphTile)
}

// V2's `endTranslate` in apps/dg/components/graph/adornments/movable_value_adornment.js (~:166)
// emits a notification with op string `'drag movable line'` for movable-VALUE drag — a confusingly
// named V2 op (the actual movable LINE has no V2 notification; see dragMovableLineNotification).
// V3 renames the value-drag emission to `drag movable value` for clarity. This is a deliberate
// V2 deviation: the V2 op name was misleading enough that no plugin would have intentionally
// matched on it for value-drag events. Bare payload. No-ops for non-graph tiles.
export function dragMovableValueNotification(graphTile: ITileModel | undefined) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("drag movable value", {}, graphTile)
}

// V2 does NOT emit a notification when the scatterplot movable LINE is dragged
// (apps/dg/components/graph/adornments/movable_line_adornment.js has a `dragMovableLine` log
// but no `executeNotification`) — a V2 gap. V3 fills it by emitting `drag movable line` here.
// Now that V3's value drag uses `drag movable value`, the op string is unambiguously the line.
// Bare payload. No-ops for non-graph tiles.
export function dragMovableLineNotification(graphTile: ITileModel | undefined) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("drag movable line", {}, graphTile)
}

// V2 emits `add movable value` from apps/dg/components/graph/plots/univariate_adornment_base_model.js
// (addMovableValue ~:195) when the user clicks the "Add" button in the movable-value adornment
// Controls. Bare payload. No-ops for non-graph tiles.
//
// NOTE: V2's `toggle movable value` (~:107) is NOT replicated here. V2's only emission of that op
// is a copy-paste bug in V2's `togglePlottedCount` override — it fires `'toggle movable value'`
// instead of the correct `'toggle plotted Count|Percent'` (audit §3.5). V3 has no
// add-all/remove-all UI, so no semantic place to emit the toggle op from anyway.
export function addMovableValueNotification(graphTile: ITileModel | undefined) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("add movable value", {}, graphTile)
}

// V2 emits `remove movable value` from apps/dg/components/graph/plots/univariate_adornment_base_model.js
// (removeMovableValue ~:272) when the user clicks "Remove". Bare payload. No-ops for non-graph tiles.
export function removeMovableValueNotification(graphTile: ITileModel | undefined) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("remove movable value", {}, graphTile)
}

// V2 emits `setNumStdErrs` from apps/dg/components/graph/plots/univariate_adornment_base_model.js
// (~:357) when the user changes the number of standard errors in the std-err adornment's number
// input. V2's payload is bare (the new value lives only in the log). V3 carries the new value
// in `to` so plugins can react without re-querying. No-ops for non-graph tiles.
export function setNumStdErrsNotification(graphTile: ITileModel | undefined, to: number) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("setNumStdErrs", { to }, graphTile)
}

// V2 emits `toggle show outliers` from apps/dg/components/graph/plots/univariate_adornment_base_model.js
// (~:462) when the user toggles the box-plot "Show Outliers" sub-option. V3 also carries
// `{ isChecked }` matching the adornment-checkbox convention.
// V2 ALSO emits `'toggle show outliers'` from `toggleShowICI` (~:511) — a wrong-op bug
// (audit §3.5). V3 does NOT replicate that; the ICI toggle uses `toggleShowICINotification`.
// No-ops for non-graph tiles.
export function toggleShowOutliersNotification(graphTile: ITileModel | undefined, isChecked: boolean) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("toggle show outliers", { isChecked }, graphTile)
}

// V3-only op. V2 incorrectly emits `'toggle show outliers'` for the ICI sub-option toggle
// (audit §3.5 bug at univariate_adornment_base_model.js:~511); V3 uses the clarifying op
// `'toggle show ICI'` so plugins can distinguish outliers vs ICI events. ICI is a research/
// developer-only feature gated by the `iciEnabled` document flag, so the V2-compat audience
// is narrow. No-ops for non-graph tiles.
export function toggleShowICINotification(graphTile: ITileModel | undefined, isChecked: boolean) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("toggle show ICI", { isChecked }, graphTile)
}

// V2 emits `drag bin boundary` from both apps/dg/components/graph/plots/binned_plot_view.js
// (~:210) and histogram_view.js (~:261) via identical `markBinParamsChange` functions, fired on
// drag-end after a user adjusts a histogram/binned-dot-plot bin boundary. V2's payload is bare
// (the new alignment/width are only in the log). V3 carries them in the notification too so
// plugins can react without re-querying. No-ops for non-graph tiles.
export function dragBinBoundaryNotification(
  graphTile: ITileModel | undefined, params: { alignment?: number, width?: number }
) {
  if (graphTile?.content.type !== kGraphTileType) return
  const values: Record<string, number> = {}
  if (params.alignment != null) values.alignment = params.alignment
  if (params.width != null) values.width = params.width
  return updateTileNotification("drag bin boundary", values, graphTile)
}

// V2 emits `reposition equation` from two sites — plotted_average_adornment.js (~:529, equation
// labels for plotted averages/measures) and twoD_line_adornment.js (~:285, equation labels for
// movable line / LSRL). Bare V2 payload. V3 adds `adornment: <type>` so plugins know which
// adornment's equation moved. No-ops for non-graph tiles.
export function repositionEquationNotification(graphTile: ITileModel | undefined, adornment: string) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("reposition equation", { adornment }, graphTile)
}

// V2 emits `swap categories` from apps/dg/components/graph/axes/cell_axis_view.js (endDrag
// ~:198) when a user finishes dragging a category label on a graph's categorical axis to a
// new position. V2's analogous LEGEND swap command at apps/dg/components/graph_map_common/
// legend/categories_view.js ~:120 has no `executeNotification` block — a V2 oversight (the
// undo/redo strings line up; only the notification is missing). V3 fires the same op from
// both code paths, additionally carrying `place` so plugins can distinguish axis vs legend
// (and which axis). No-ops for non-graph tiles — the axis hook and legend component are
// shared with the map tile, which V2 also did not emit for.
export function swapCategoriesNotification(graphTile: ITileModel | undefined, place: GraphPlace) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("swap categories", { place }, graphTile)
}
