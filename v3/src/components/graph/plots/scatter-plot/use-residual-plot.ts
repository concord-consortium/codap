import { active, format, ScaleLinear, select } from "d3"
import { tip as d3tip } from "d3-v6-tip"
import { untracked } from "mobx"
import { useCallback, useEffect, useRef } from "react"
import { IDataSet } from "../../../../models/data/data-set"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { t } from "../../../../utilities/translation/translate"
import { transitionDuration } from "../../../data-display/data-display-types"
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
  isAnimating: () => boolean
}

// A residual point plus the screen position it should occupy. Carried on the joined datum so the
// enter and update selections read the coordinates without recomputing them.
type IPositionedResidualPoint = IResidualPoint & { cx: number, cy: number }

// True when every point would land exactly where the previous paint put it. Compares by case ID
// rather than by index so a reordered case array doesn't read as a move. A NaN coordinate always
// compares unequal, which errs toward repainting.
function samePositions(prev: Map<string, IPositionedResidualPoint> | null, next: IPositionedResidualPoint[]) {
  if (prev?.size !== next.length) return false
  return next.every(d => {
    const prevPoint = prev.get(d.caseID)
    return prevPoint?.cx === d.cx && prevPoint?.cy === d.cy
  })
}

// Owns the Residual Plot's SVG rendering, split-layout sync, and selection-halo restyle. The
// ScatterPlot consumes the returned refs/callbacks: refreshPointPositions calls renderResidualsIfActive
// (drag caching) and refreshPointSelection calls restyleResidualSelection (selection halo).
export function useResidualPlot(props: IUseResidualPlot) {
  const { graphModel, dataConfiguration, dataset, layout, legendAttrID, isAnimating } = props
  const adornmentsStore = graphModel.adornmentsStore
  const residualPointsRef = useRef<SVGGElement>(null)
  // Target positions of the last paint, keyed by case ID. renderResidualPoints consults this before
  // touching cx/cy at all: a repaint that would land every point exactly where it is already headed
  // must leave an in-flight transition alone rather than interrupting or restarting it.
  //
  // This matters because one logical change produces several repaints. Changing an attribute fires
  // the syncResidualPlot autorun below three times: it writes the axis and MultiScale domains that
  // it also reads, so MobX re-schedules it, and the graph's layout then reflows (a taller y range
  // widens the left axis labels, which shifts the bottom axis and every point's cx). Only the first
  // of those repaints knows what caused it, and the later ones can carry genuinely different
  // coordinates — so "did anything actually move" is the only reliable question to ask here.
  const lastRenderedPositionsRef = useRef<Map<string, IPositionedResidualPoint> | null>(null)

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
  //
  // Radius handling: circles that come in at r=0 (enter selection in renderResidualPoints, marking
  // "newly-appeared point") animate up to their assigned radius via a named "radius" transition
  // that survives the "cxcy" interrupt in the snap path of renderResidualPoints. Existing circles
  // snap. If a "radius" transition is in flight (typical when a debounced piggyback re-runs
  // applyResidualStyles right after the enter, or when the user drags a point within ~1s of
  // showing the residual plot), leave r alone — snapping via .attr would flash the point at its
  // full radius before the fade-in resumes. We can't redirect the transition target either;
  // once the transition is past its "starting" phase, .attr on it throws "too late; already
  // running", and the point-radius-changed-mid-fade case (which the redirect would handle) is
  // rare enough that finishing at the old target is acceptable — the next applyResidualStyles
  // after the fade-in completes will snap to the current radius.
  const applyResidualStyles = useCallback((g: SVGGElement) => {
    select(g).selectAll<SVGCircleElement, IResidualPoint>("circle")
      .each(function (d) {
        const style = styleFor(d.caseID)
        const sel = select(this)
        if (!active(this, "radius")) {
          const currentR = +sel.attr("r")
          if (currentR === 0 && style.radius > 0) {
            sel.transition("radius").duration(transitionDuration).attr("r", style.radius)
          } else {
            sel.attr("r", style.radius)
          }
        }
        sel
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
  //
  // animateCxCy tracks the main plot: callers pass isAnimating(), the same signal the upper plot's
  // points use, so the residual points ease in step with the points they mirror and snap the rest
  // of the time. Everything that needs immediate positions — dragging a point, dragging the line,
  // dragging an axis — ends the animation at drag start, so isAnimating() is already false by the
  // first drag frame and residuals track the cursor in real time.
  //
  // Snap uses .interrupt("cxcy") so a slide still in flight when a drag begins is killed rather
  // than fighting the snap on every tick. The name is scoped so the enter-circle "radius" fade-in
  // survives — otherwise the debounced piggyback that follows a case-add would cancel the r=0→full
  // transition and flash the new point at full radius.
  //
  // Both paths are guarded on positions having actually changed (see lastRenderedPositionsRef): a
  // repaint that moves nothing has nothing to snap to and nothing to animate toward, and acting on
  // it would cancel or restart a slide already going where it belongs.
  const renderResidualPoints = useCallback((residuals: IResidualPoint[], animateCxCy = false) => {
    const g = residualPointsRef.current
    if (!g) return
    const { getXCoord } = scatterPlotFuncs(layout, dataConfiguration)
    const lowerScale = layout.getAxisScale("leftLower") as ScaleLinear<number, number> | undefined
    if (!lowerScale) {
      select(g).selectAll("circle").remove()
      lastRenderedPositionsRef.current = null
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
    const positioned: IPositionedResidualPoint[] = residuals.map(d => ({
      ...d, cx: getXCoord(d.caseID), cy: plotHeight + lowerScale(d.residual)
    }))
    const positionsChanged = !samePositions(lastRenderedPositionsRef.current, positioned)
    lastRenderedPositionsRef.current = new Map(positioned.map(d => [d.caseID, d]))
    const selection = select(g).selectAll<SVGCircleElement, IPositionedResidualPoint>("circle")
      .data(positioned, d => d.caseID)
    selection.exit().remove()
    // Enter: new circles at their final cx/cy with r=0. applyResidualStyles below transitions r up
    // to the assigned radius (see currentR===0 branch there), so newly-appeared residual points
    // fade in from a dot the way newly-appeared main-plot points do.
    const enterSelection = selection.enter().append("circle")
      .attr("data-testid", d => `residual-point-${d.caseID}`)
      .attr("cx", d => d.cx)
      .attr("cy", d => d.cy)
      .attr("r", 0)
    // Cursor and handlers are bound on enter+update every paint. tipTextFor closes over the x
    // attribute's ID and name as of this paint, and the join is keyed by case ID, so circles survive
    // an attribute change — handlers left in place from an earlier paint would report the previous x
    // attribute's name and value.
    enterSelection.merge(selection)
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
    // Update-only cx/cy: animate when the caller asks for it, snap otherwise — and do neither when
    // every point is already headed where it belongs, so a repaint that moves nothing leaves an
    // in-flight slide running instead of interrupting or restarting it. New circles already have
    // their final positions from the enter block, so excluding them here avoids a spurious
    // transition-from-undefined.
    if (positionsChanged) {
      if (animateCxCy) {
        selection.transition("cxcy").duration(transitionDuration)
          .attr("cx", d => d.cx)
          .attr("cy", d => d.cy)
      } else {
        selection.interrupt("cxcy")
          .attr("cx", d => d.cx)
          .attr("cy", d => d.cy)
      }
    }
    // Apply current selection styling to enter+update circles without subscribing to selection.
    // Enter circles (r=0) get their r transitioned up here.
    untracked(() => applyResidualStyles(g))
  }, [layout, dataConfiguration, dataset, applyResidualStyles])

  // Recompute and repaint the residual points if the Residual Plot is active and all applicability
  // constraints hold. Used by the post-mount effect and by scatter-plot's refreshPointPositions
  // piggyback (drag frames + attribute-change refreshes). Callers pass animateCxCy=true to have
  // cx/cy transition; the default snaps. No-op when inactive.
  const renderResidualsIfActive = useCallback((animateCxCy = false) => {
    if (!adornmentsStore.showResidualPlot) return
    if (!residualPlotIsApplicable(adornmentsStore, dataConfiguration)) return
    if (!dataConfiguration) return
    const predictor = getPredictor(adornmentsStore, dataConfiguration)
    if (!predictor) return
    renderResidualPoints(computeResiduals(dataConfiguration, predictor), animateCxCy)
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
        // Forget the last-rendered positions so the first paint after re-activation isn't mistaken
        // for a no-op and skipped.
        lastRenderedPositionsRef.current = null
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
      // Animate whenever the main plot is animating, so the residual points ease alongside the
      // points they mirror. renderResidualPoints ignores the request when nothing has moved, which
      // is what keeps this fire and the two that follow it — the re-fire provoked by the domain
      // writes above, and the one that follows the layout reflow — from restarting the same slide.
      renderResidualPoints(residuals, isAnimating())
    }, { name: "ScatterPlot.syncResidualPlot" }, graphModel)
  }, [adornmentsStore, dataConfiguration, graphModel, isAnimating, layout, renderResidualPoints])

  // Post-mount effect: the residual points <g> is conditionally mounted on layout.showLowerPlot,
  // so its ref is null the first time the autorun runs (state flips and JSX re-renders in the same
  // tick). This redraws once the group is committed.
  useEffect(function drawResidualPointsAfterMount() {
    renderResidualsIfActive()
  }, [layout.showLowerPlot, adornmentsStore.showResidualPlot, renderResidualsIfActive])

  return { residualPointsRef, renderResidualsIfActive, restyleResidualSelection }
}
