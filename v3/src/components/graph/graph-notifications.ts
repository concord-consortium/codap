import { ITileModel } from "../../models/tiles/tile-model"
import { updateTileNotification } from "../../models/tiles/tile-notifications"
import { GraphPlace } from "../axis-graph-shared"
import { legendMenuAttributeChangeNotification } from "../data-display/data-display-notifications"
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

// V2 emits `legendAttributeChange` from apps/dg/components/graph_map_common/data_display_controller.js
// (plotOrLegendViewDidAcceptDrop :928-949), which handles drops on both the legend and the plot area.
// Its `type` is the display model's class, `DG.GraphModel`, rather than the graph view's `DG.GraphView`.
// V3 additionally carries the `IAttrChangeValues` fields (attributeId, plotType, primaryAxis).
// No-ops for non-graph tiles.
export function legendAttributeChangeNotification(
  graphTile: ITileModel | undefined, values: IAttrChangeValues | undefined
) {
  if (graphTile?.content.type !== kGraphTileType) return
  const notification = updateTileNotification("legendAttributeChange", values ?? {}, graphTile)
  if (notification) notification.message.values.type = "DG.GraphModel"
  return notification
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

// V2 emits `showAllCases` from apps/dg/components/graph_map_common/data_layer_model.js (~:680)
// when the user clicks "Show All" in the inspector hide/show menu. V2 emits with `type: ''`
// (empty string — likely accidental, since the shared graph_map_common file doesn't know the SC
// class name at that point). V3 emits with the correct `'DG.GraphView'` type via tileNotification —
// an implicit V2 wart-fix. Bare payload. No-ops for non-graph tiles (map is CODAP-1352).
export function showAllCasesNotification(graphTile: ITileModel | undefined) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("showAllCases", {}, graphTile)
}

// V2 emits `displayOnlySelected` from apps/dg/components/graph_map_common/data_layer_model.js
// (~:705) when the user picks "Display Only Selected Cases". Same `type: ''` V2 wart as
// showAllCases; V3 emits with the correct type. Bare payload. No-ops for non-graph tiles.
export function displayOnlySelectedNotification(graphTile: ITileModel | undefined) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("displayOnlySelected", {}, graphTile)
}

// V2 emits `edit plot formula` from apps/dg/components/graph/adornments/plotted_formula_edit_context.js
// (createEditCommand ~:102) when the user applies a new formula via the plotted-value or plotted-function
// edit dialog. V2's payload is bare. V3 additionally carries `{ adornment, from, to }` so plugins can
// tell which adornment's formula was edited and see the old/new expressions. No-ops for non-graph tiles.
export function editPlotFormulaNotification(
  graphTile: ITileModel | undefined, adornment: string, from: string, to: string
) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("edit plot formula", { adornment, from, to }, graphTile)
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

interface IGraphAttributeChangeOptions {
  attrId: string
  attrName?: string
  // the change or removal was made from an attribute menu rather than by a drop
  fromMenu?: boolean
}

// Chooses the notification for an attribute placed on, replaced on or removed from a graph, as V2 does.
// `place` is where the attribute ends up: a plot-area drop on an empty graph goes to the bottom axis,
// as in V2 (graph_controller.js:743-747), and is reported as an axis change.
// - Drops on the y-axis "+" target and the Y2 axis send their own operations (see above).
// - A drop on the legend or the plot area sends `legendAttributeChange`.
// - A change or removal from the legend's menu sends `attributeChange` with axisOrientation "none"
//   (see legendMenuAttributeChangeNotification).
// - Everything else -- an axis drop, or a change or removal from an axis's menu, the Y2 axis's included
//   (data_display_controller.js:843-866) -- sends `attributeChange` with the axis's orientation.
export function graphAttributeChangeNotification(
  graphTile: ITileModel | undefined, place: GraphPlace, values: IAttrChangeValues | undefined,
  { attrId, attrName, fromMenu }: IGraphAttributeChangeOptions
) {
  if (graphTile?.content.type !== kGraphTileType) return
  const isLegend = place === "legend" || place === "plot"
  if (fromMenu && isLegend) return legendMenuAttributeChangeNotification(graphTile, attrId, attrName)
  if (!fromMenu) {
    if (place === "yPlus") return addAxisAttributeNotification(graphTile, values)
    if (place === "rightNumeric") return add2ndAxisAttributeNotification(graphTile, values)
    if (isLegend) return legendAttributeChangeNotification(graphTile, values)
  }
  return updateTileNotification("attributeChange", values ?? {}, graphTile)
}
