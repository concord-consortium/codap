import { format, ScaleLinear, select } from "d3"
import { tip as d3tip } from "d3-v6-tip"
import { untracked } from "mobx"
import { useCallback, useEffect, useRef } from "react"
import { IDataSet } from "../../../../models/data/data-set"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { t } from "../../../../utilities/translation/translate"
import { handleClickOnCase } from "../../../data-display/data-display-utils"
import { isNumericAxisModel, NumericAxisModel } from "../../../axis/models/numeric-axis-models"
import { IGraphContentModel } from "../../models/graph-content-model"
import { IGraphDataConfigurationModel } from "../../models/graph-data-configuration-model"
import { GraphLayout } from "../../models/graph-layout"
import {
  computeResiduals, getPredictor, IResidualPoint, residualDomain, residualPlotIsApplicable, residualPointStyle
} from "./residual-plot-utils"
import { scatterPlotFuncs } from "./scatter-plot-utils"

interface IUseResidualPlot {
  graphModel: IGraphContentModel
  dataConfiguration?: IGraphDataConfigurationModel
  dataset?: IDataSet
  layout: GraphLayout
  legendAttrID?: string
}

// Owns the Residual Plot's SVG rendering, split-layout sync, and selection-halo restyle. The
// ScatterPlot consumes the returned refs/callbacks: refreshPointPositions calls renderResidualsIfActive
// (drag caching) and refreshPointSelection calls restyleResidualSelection (selection halo).
export function useResidualPlot(props: IUseResidualPlot) {
  const { graphModel, dataConfiguration, dataset, layout, legendAttrID } = props
  const adornmentsStore = graphModel.adornmentsStore
  const residualPointsRef = useRef<SVGGElement>(null)

  // Hover tooltip for residual points. Matches the "graph-d3-tip" styling used by other adornment
  // hovers so the tip visually reads like the main plot's data tips. The `no-svg-export` class
  // keeps it out of image exports. Disposed on unmount so the DOM node d3-tip attaches to
  // document.body doesn't leak across scatter-plot mounts.
  const residualDataTipRef = useRef(
    d3tip().attr("class", "graph-d3-tip no-svg-export")
      .attr("data-testid", "residual-data-tip")
      .html((d: string) => `<p>${d}</p>`)
  )
  useEffect(() => {
    const tip = residualDataTipRef.current
    return () => { tip.destroy?.() }
  }, [])

  // Selection-dependent styling for one residual point. Reads the dataset selection (observable),
  // so callers in a reactive context must apply it via untracked (see renderResidualPoints) to avoid
  // subscribing to selection. Delegates the pure decision to residualPointStyle (unit-tested).
  const styleFor = useCallback((caseID: string) => {
    const isSelected = !!dataset?.isCaseSelected(caseID)
    // The legend handling here is intentionally retained even though residualPlotIsApplicable
    // currently excludes legends (so legendAttrID is always undefined in this path today). Coloring
    // each residual point by its legend category is structurally/mathematically well-defined — each
    // point's residual is taken against its own category's line, and the adornments already store a
    // line per cell — so this is kept ready for a future legend-supporting version rather than
    // removed as dead code. (Enabling it also means dropping the legend exclusion and making the
    // predictor cell-aware; see getPredictor/computeResiduals in residual-plot-utils.)
    const legendColor = legendAttrID ? dataConfiguration?.getLegendColorForCase(caseID) : undefined
    const { pointColor, pointStrokeColor } = graphModel.pointDescription
    return residualPointStyle({
      isSelected, hasLegend: !!legendAttrID, legendColor, pointColor, pointStrokeColor,
      pointRadius: graphModel.getPointRadius(), selectedRadius: graphModel.getPointRadius('select')
    })
  }, [dataset, legendAttrID, dataConfiguration, graphModel])

  // Selection-only restyle: re-set the selection-dependent attrs on the existing circles. No data
  // join, no residual/predictor recompute — a selection change (via refreshPointSelection) updates
  // styling without re-running the residual pipeline.
  // Compute the style once per circle (styleFor does selection/legend lookups) rather than per attr.
  const applyResidualStyles = useCallback((g: SVGGElement) => {
    select(g).selectAll<SVGCircleElement, IResidualPoint>("circle")
      .each(function (d) {
        const style = styleFor(d.caseID)
        select(this)
          .attr("r", style.radius)
          .attr("fill", style.fill)
          .attr("stroke", style.stroke)
          .attr("stroke-width", style.strokeWidth)
          .attr("stroke-opacity", style.strokeOpacity)
      })
  }, [styleFor])

  // Restyle residual points to track the current selection. Called by refreshPointSelection on every
  // selection change. Cheap (attrs only) and does not touch the split layout or the leftLower axis.
  const restyleResidualSelection = useCallback(() => {
    const g = residualPointsRef.current
    if (g) applyResidualStyles(g)
  }, [applyResidualStyles])

  // Geometry + structure paint: the data join, positions, hover tip, and click handling. Selection
  // styling is applied at the end under untracked so that the syncResidualPlot autorun (which calls
  // this) does not subscribe to the selection set — otherwise every selection change would re-fire
  // the autorun and recompute the predictor/residuals purely to update halos.
  const renderResidualPoints = useCallback((residuals: IResidualPoint[]) => {
    const g = residualPointsRef.current
    if (!g) return
    const { getXCoord } = scatterPlotFuncs(layout, dataConfiguration)
    const lowerScale = layout.getAxisScale("leftLower") as ScaleLinear<number, number> | undefined
    if (!lowerScale) {
      select(g).selectAll("circle").remove()
      return
    }
    const plotHeight = layout.plotHeight
    // Hover tip: "<xAttrName>: <xValue><br/>Residual: <value>". Numeric formatting mirrors the
    // main plot's data tip (three significant figures via d3.format('.3~f')).
    const xAttrID = dataConfiguration?.attributeID("x") ?? ""
    const xAttr = dataset?.getAttribute(xAttrID)
    const xAttrName = xAttr?.name ?? ""
    const float = format(".3~f")
    const tipTextFor = (d: IResidualPoint) => {
      const xValue = dataset?.getValue(d.caseID, xAttrID)
      const xValueStr = typeof xValue === "number" && isFinite(xValue)
        ? float(xValue) : (xValue != null ? String(xValue) : "")
      const residualStr = isFinite(d.residual) ? float(d.residual) : String(d.residual)
      return `${xAttrName}: ${xValueStr}<br/>${t("V3.ResidualPlot.dataTip.residual")}: ${residualStr}`
    }
    const residualTip = residualDataTipRef.current
    // Install the tip on the parent SVG so absolute positioning works.
    select(g).call(residualTip)
    select(g).selectAll<SVGCircleElement, IResidualPoint>("circle")
      .data(residuals, d => d.caseID)
      .join("circle")
      .attr("data-testid", d => `residual-point-${d.caseID}`)
      .attr("cx", d => getXCoord(d.caseID))
      .attr("cy", d => plotHeight + lowerScale(d.residual))
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) { residualTip.show(tipTextFor(d), this) })
      .on("mouseout", () => residualTip.hide())
      .on("click", (event, d) => {
        // handleClickOnCase honors shift/meta/ctrl for extend selection, matching the upper plot.
        // stopPropagation prevents the click from bubbling to the residual-plot-background rect,
        // whose handler would immediately deselect everything the click just selected.
        event.stopPropagation()
        if (dataset) handleClickOnCase(event, d.caseID, dataset)
      })
    // Apply current selection styling to the (possibly new) circles without subscribing to selection.
    untracked(() => applyResidualStyles(g))
  }, [layout, dataConfiguration, dataset, applyResidualStyles])

  // Recompute and repaint the residual points if the Residual Plot is active and all applicability
  // constraints hold. Single entry-point used by every code path that needs to refresh the residual
  // rendering — the sync autorun, the post-mount effect, the upper-plot's refreshPointPositions
  // (drag caching), and refreshPointSelection (selection halo sync). No-op when inactive.
  const renderResidualsIfActive = useCallback(() => {
    if (!adornmentsStore.showResidualPlot) return
    if (!residualPlotIsApplicable(adornmentsStore, dataConfiguration)) return
    if (!dataConfiguration) return
    const predictor = getPredictor(adornmentsStore, dataConfiguration)
    if (!predictor) return
    renderResidualPoints(computeResiduals(dataConfiguration, predictor))
  }, [adornmentsStore, dataConfiguration, renderResidualPoints])

  // Sync the split-plot layout, lower y-axis registration, and residual point rendering with the
  // Residual Plot store boolean and applicability. When active, activate the split layout, ensure a
  // NumericAxisModel at "leftLower" with the auto-scaled residual domain, and paint the residual
  // points. When inactive, tear the split down and clear the points. The store boolean persists as
  // user intent (mirroring Squares of Residuals); this reaction owns the derived state.
  //
  // Load-bearing pattern: every mutation below is preceded by a read-and-compare guard
  // (`if (!layout.showLowerPlot)`, `if (axis.min !== minY || ...)`, etc.). MobX would otherwise
  // re-fire this autorun on its own mutations because it reads the same observables it writes
  // (layout.showLowerPlot, axis.min/max, etc.). The guards make each mutation idempotent so a
  // re-fire converges immediately. Do NOT remove any guard without adding equivalent protection —
  // an unguarded write here creates an infinite reaction loop.
  useEffect(function syncResidualPlot() {
    return mstAutorun(() => {
      // Tear the split down: collapse the lower region, drop the leftLower axis, clear the points.
      // Idempotent (each mutation is guarded), so calling it when already inactive is a no-op.
      const teardown = () => {
        if (layout.showLowerPlot) layout.setShowLowerPlot(false)
        if (graphModel.getAxis("leftLower")) graphModel.removeAxis("leftLower")
        if (residualPointsRef.current) select(residualPointsRef.current).selectAll("circle").remove()
      }
      const isActive = adornmentsStore.showResidualPlot && residualPlotIsApplicable(adornmentsStore, dataConfiguration)
      if (!isActive) {
        teardown()
        return
      }
      // Applicability doesn't guarantee the line is computable (e.g. an LSRL with < 2 finite points,
      // or a plotted function not yet populated). If there's no predictor, tear down rather than
      // leaving stale residual UI on screen.
      const predictor = getPredictor(adornmentsStore, dataConfiguration)
      if (!predictor || !dataConfiguration) {
        teardown()
        return
      }
      const residuals = computeResiduals(dataConfiguration, predictor)
      const [minY, maxY] = residualDomain(residuals)
      if (!layout.showLowerPlot) layout.setShowLowerPlot(true)
      let axis = graphModel.getAxis("leftLower")
      if (!axis || !isNumericAxisModel(axis)) {
        graphModel.setAxis("leftLower", NumericAxisModel.create({ place: "leftLower", min: minY, max: maxY }))
        axis = graphModel.getAxis("leftLower")
      }
      if (axis && isNumericAxisModel(axis)) {
        if (axis.min !== minY || axis.max !== maxY) {
          // setDomain is grow-only by default; the Residual Plot's domain must be able to shrink as
          // the line moves closer to fit. Allow shrinking for this one call (the flag auto-resets).
          axis.setAllowRangeToShrink(true)
          axis.setDomain(minY, maxY)
        }
      }
      // The graph-controller's installAxisReaction only watches "left" and "bottom"; changes to the
      // "leftLower" axis model do not automatically push through to the MultiScale that owns the D3
      // scale used for pixel mapping. Sync explicitly — guarded like the mutations above so a re-fire
      // with an unchanged scale type / domain is a no-op (setNumericDomain would otherwise write a
      // fresh array every run and churn the domain observable during e.g. movable-line drag). Guard
      // on the MultiScale's own domain, not the axis model's: on first activation the model already
      // carries [minY, maxY], so an axis-based guard would wrongly skip the initial MultiScale sync.
      const multiScale = layout.getAxisMultiScale("leftLower")
      if (multiScale.scaleType !== "linear") layout.setAxisScaleType("leftLower", "linear")
      const [curMin, curMax] = multiScale.numericDomain
      if (curMin !== minY || curMax !== maxY) {
        multiScale.setNumericDomain([minY, maxY])
      }
      renderResidualPoints(residuals)
    }, { name: "ScatterPlot.syncResidualPlot" }, graphModel)
  }, [adornmentsStore, dataConfiguration, graphModel, layout, renderResidualPoints])

  // Post-mount effect: the residual points <g> is conditionally mounted on layout.showLowerPlot,
  // so its ref is null the first time the autorun runs (state flips and JSX re-renders in the same
  // tick). This redraws once the group is committed.
  useEffect(function drawResidualPointsAfterMount() {
    renderResidualsIfActive()
  }, [layout.showLowerPlot, adornmentsStore.showResidualPlot, renderResidualsIfActive])

  return { residualPointsRef, renderResidualsIfActive, restyleResidualSelection }
}
