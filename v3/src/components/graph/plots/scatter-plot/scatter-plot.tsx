import {format, ScaleLinear, select} from "d3"
import { tip as d3tip } from "d3-v6-tip"
import { untracked } from "mobx"
import { observer } from "mobx-react-lite"
import {useCallback, useEffect, useRef, useState} from "react"
import {useDataSetContext} from "../../../../hooks/use-data-set-context"
import {useInstanceIdContext} from "../../../../hooks/use-instance-id-context"
import {appState} from "../../../../models/app-state"
import {ICase} from "../../../../models/data/data-set-types"
import {
  firstVisibleParentAttribute, idOfChildmostCollectionForAttributes, selectAllCases
} from "../../../../models/data/data-set-utils"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { t } from "../../../../utilities/translation/translate"
import {ScaleNumericBaseType} from "../../../axis/axis-types"
import { getDomainExtentForPixelWidth } from "../../../axis/axis-utils"
import { If } from "../../../common/if"
import { CaseData } from "../../../data-display/d3-types"
import { handleClickOnCase, setPointSelection } from "../../../data-display/data-display-utils"
import { dataDisplayGetNumericValue } from "../../../data-display/data-display-value-utils"
import { useConnectingLines } from "../../../data-display/hooks/use-connecting-lines"
import {useDataDisplayAnimation} from "../../../data-display/hooks/use-data-display-animation"
import { IPoint, IPointMetadata } from "../../../data-display/renderer"
import { ILSRLAdornmentModel } from "../../adornments/lsrl/lsrl-adornment-model"
import { IMovableLineAdornmentModel } from "../../adornments/movable-line/movable-line-adornment-model"
import { IPlottedFunctionAdornmentModel } from "../../adornments/plotted-function/plotted-function-adornment-model"
import {ISquareOfResidual} from "../../adornments/shared-adornment-types"
import { kLSRLType } from "../../adornments/lsrl/lsrl-adornment-types"
import { kMovableLineType } from "../../adornments/movable-line/movable-line-adornment-types"
import { kPlottedFunctionType } from "../../adornments/plotted-function/plotted-function-adornment-types"
import {IPlotProps} from "../../graphing-types"
import {useGraphContentModelContext} from "../../hooks/use-graph-content-model-context"
import {useGraphDataConfigurationContext} from "../../hooks/use-graph-data-configuration-context"
import {useGraphLayoutContext} from "../../hooks/use-graph-layout-context"
import {useRendererDragHandlers, usePlotResponders} from "../../hooks/use-plot"
import { setPointCoordinates } from "../../utilities/graph-utils"
import { isNumericAxisModel, NumericAxisModel } from "../../../axis/models/numeric-axis-models"
import {
  computeResiduals, getPredictor, IResidualPoint, residualDomain, residualPlotIsApplicable, residualPointStyle
} from "./residual-plot-utils"
import { scatterPlotFuncs } from "./scatter-plot-utils"

export const ScatterPlot = observer(function ScatterPlot({ renderer }: IPlotProps) {
  const graphModel = useGraphContentModelContext(),
    instanceId = useInstanceIdContext(),
    dataConfiguration = useGraphDataConfigurationContext(),
    {isAnimating, startAnimation, stopAnimation} = useDataDisplayAnimation(),
    dataset = useDataSetContext(),
    secondaryAttrIDsRef = useRef<string[]>([]),
    selectedPointRadiusRef = useRef(0),
    dragPointRadiusRef = useRef(0),
    layout = useGraphLayoutContext(),
    legendAttrID = dataConfiguration?.attributeID('legend') as string,
    yScaleRef = useRef<ScaleNumericBaseType>(),
    [dragID, setDragID] = useState(''),
    currPos = useRef({x: 0, y: 0}),
    didDrag = useRef(false),
    selectedDataObjects = useRef<Record<string, { x: number, y: number }>>({}),
    plotNumRef = useRef(0),
    numExtraPrimaryBands = dataConfiguration?.numRepetitionsForPlace('bottom') ?? 1,
    numExtraSecondaryBands = dataConfiguration?.numRepetitionsForPlace('left') ?? 1

  // The Squares of Residuals option is controlled by the AdornmentsStore, so we need to watch for changes to that store
  // and call refreshSquares when the option changes. The squares are rendered in connection with the Movable Line and
  // LSRL adornments, so we need to get information from those adornments as well.
  const adornmentsStore = graphModel.adornmentsStore
  const showSquares = adornmentsStore.showSquaresOfResiduals
  const movableLine = adornmentsStore.findAdornmentOfType<IMovableLineAdornmentModel>(kMovableLineType)
  const lsrl = adornmentsStore.findAdornmentOfType<ILSRLAdornmentModel>(kLSRLType)
  const plottedFunctionModel = adornmentsStore.findAdornmentOfType<IPlottedFunctionAdornmentModel>(kPlottedFunctionType)
  const movableLineSquaresRef = useRef<SVGGElement>(null)
  const lsrlSquaresRef = useRef<SVGGElement>(null)
  const functionSquaresRef = useRef<SVGGElement>(null)
  const residualPointsRef = useRef<SVGGElement>(null)

  const connectingLinesRef = useRef<SVGGElement>(null)
  const connectingLinesActivatedRef = useRef(false)

  const isCaseInSubPlot = useCallback((cellKey: Record<string, string>, caseData: Record<string, any>) => {
    return dataConfiguration?.isCaseInSubPlot(cellKey, caseData)
  }, [dataConfiguration])

  const { renderConnectingLines } = useConnectingLines({
    clientType: "graph", renderer, connectingLinesSvg: connectingLinesRef.current, connectingLinesActivatedRef,
    yAttrCount: dataConfiguration?.yAttributeIDs?.length, isCaseInSubPlot
  })

  secondaryAttrIDsRef.current = dataConfiguration?.yAttributeIDs || []
  selectedPointRadiusRef.current = graphModel.getPointRadius('select')
  dragPointRadiusRef.current = graphModel.getPointRadius('hover-drag')
  yScaleRef.current = layout.getAxisScale("left") as ScaleNumericBaseType

  const onDragStart = useCallback((event: PointerEvent, _point: IPoint, metadata: IPointMetadata) => {
    dataset?.beginCaching()
    secondaryAttrIDsRef.current = dataConfiguration?.yAttributeIDs || []
    stopAnimation() // We don't want to animate points until end of drag
    didDrag.current = false
    const tItsID = metadata.caseID
    plotNumRef.current = metadata.plotNum
    appState.beginPerformance()
    setDragID(tItsID)
    currPos.current = { x: event.clientX, y: event.clientY }
    handleClickOnCase(event, tItsID, dataset)
    // Record the current values, so we can change them during the drag and restore them when done
    const { selection } = dataConfiguration || {}
    const xAttrID = dataConfiguration?.attributeID('x') ?? ''

    selection?.forEach(anID => {
      selectedDataObjects.current[anID] = {
        x: dataDisplayGetNumericValue(dataset, anID, xAttrID) ?? 0,
        y: dataDisplayGetNumericValue(dataset, anID, secondaryAttrIDsRef.current[plotNumRef.current]) ?? 0
      }
    })
  }, [dataConfiguration, dataset, stopAnimation])

  const onDrag = useCallback((event: PointerEvent) => {
    const xAxisScale = layout.getAxisScale('bottom') as ScaleLinear<number, number>
    const xAttrID = dataConfiguration?.attributeID('x') ?? ''
    const canDragX = !dataset?.getAttribute(xAttrID)?.hasFormula
    const canDragY = !dataset?.getAttribute(secondaryAttrIDsRef.current[plotNumRef.current])?.hasFormula
    if (dragID !== '') {
      const newPos = { x: event.clientX, y: event.clientY }
      const dx = canDragX ? newPos.x - currPos.current.x : 0
      const dy = canDragY ? newPos.y - currPos.current.y : 0
      currPos.current = newPos
      if (dx !== 0 || dy !== 0) {
        didDrag.current = true
        const deltaX = numExtraPrimaryBands * getDomainExtentForPixelWidth(dx, xAxisScale),
          deltaY = numExtraSecondaryBands * getDomainExtentForPixelWidth(dy, yScaleRef.current),
          caseValues: ICase[] = [],
          { selection } = dataConfiguration || {}
        selection?.forEach((anID: string) => {
          const currX = Number(dataDisplayGetNumericValue(dataset, anID, xAttrID)),
            currY = Number(dataDisplayGetNumericValue(dataset, anID, secondaryAttrIDsRef.current[plotNumRef.current]))
          if (isFinite(currX) && isFinite(currY)) {
            caseValues.push({
              __id__: anID,
              [xAttrID]: currX + deltaX,
              [secondaryAttrIDsRef.current[plotNumRef.current]]: currY + deltaY
            })
          }
        })
        caseValues.length &&
          dataset?.setCaseValues(caseValues,
            [xAttrID, secondaryAttrIDsRef.current[plotNumRef.current]])
      }
    }
  }, [layout, dataConfiguration, dataset, dragID, numExtraPrimaryBands, numExtraSecondaryBands])

  const onDragEnd = useCallback(() => {
    // We turn these off first so that transitions will work properly when we update the data values
    dataset?.endCaching()
    appState.endPerformance()
    if (dragID !== '') {
      setDragID(() => '')
      if (didDrag.current) {
        const caseValues: ICase[] = [],
          { selection } = dataConfiguration || {},
          xAttrID = dataConfiguration?.attributeID('x') ?? ''
        selection?.forEach(anID => {
          caseValues.push({
            __id__: anID,
            [xAttrID]: selectedDataObjects.current[anID].x,
            [secondaryAttrIDsRef.current[plotNumRef.current]]: selectedDataObjects.current[anID].y
          })
        })
        startAnimation() // So points will animate back to original positions
        caseValues.length && dataset?.setCaseValues(caseValues,
          [xAttrID, secondaryAttrIDsRef.current[plotNumRef.current]])
        didDrag.current = false
      }
    }
  }, [dataConfiguration, dataset, dragID, startAnimation])

  useRendererDragHandlers(renderer, {start: onDragStart, drag: onDrag, end: onDragEnd})

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
    const dataTip = residualDataTipRef.current
    // Install the tip on the parent SVG so absolute positioning works.
    select(g).call(dataTip)
    select(g).selectAll<SVGCircleElement, IResidualPoint>("circle")
      .data(residuals, d => d.caseID)
      .join("circle")
      .attr("data-testid", d => `residual-point-${d.caseID}`)
      .attr("cx", d => getXCoord(d.caseID))
      .attr("cy", d => plotHeight + lowerScale(d.residual))
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) { dataTip.show(tipTextFor(d), this) })
      .on("mouseout", () => dataTip.hide())
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

  // When caseIds is provided, only those cases' points are restyled (delta path used during a
  // marquee drag); otherwise every point is restyled.
  const refreshPointSelection = useCallback((caseIds?: Set<string>) => {
    const {pointColor, pointStrokeColor} = graphModel.pointDescription
    dataConfiguration && setPointSelection(
      {
        renderer, dataConfiguration, pointRadius: graphModel.getPointRadius(),
        selectedPointRadius: selectedPointRadiusRef.current,
        pointColor, pointStrokeColor, getPointColorAtIndex: graphModel.pointDescription.pointColorAtIndex
      }, caseIds, dataConfiguration.numberOfPlots)
    // Restyle the residual points so their selection halo tracks the upper plot's. This is a
    // style-only pass (no predictor/residual recompute, no data join), so selecting cases doesn't
    // re-run the residual pipeline. The caseIds delta is a Pixi-only optimization that doesn't apply
    // to our SVG circles, so we restyle all of them.
    restyleResidualSelection()
  }, [dataConfiguration, graphModel, renderer, restyleResidualSelection])

  // Accept showLines parameter to avoid stale closure issues during rapid state changes
  const refreshConnectingLines = useCallback(async (showLines: boolean) => {
    if (!showLines && !connectingLinesActivatedRef.current) return
    const { connectingLinesForCases } = scatterPlotFuncs(layout, dataConfiguration)
    const connectingLines = connectingLinesForCases()
    const childmostCollectionId = idOfChildmostCollectionForAttributes(dataConfiguration?.attributes ?? [], dataset)
    const parentAttr = firstVisibleParentAttribute(dataset, childmostCollectionId)
    const parentAttrID = parentAttr?.id
    const parentAttrName = parentAttr?.name
    const cellKeys = dataConfiguration?.getAllCellKeys()
    const pointDescription = graphModel.pointDescription
    const pointColorAtIndex = pointDescription.pointColorAtIndex
    const pointSizeMultiplier = pointDescription.pointSizeMultiplier
    const pointsHaveBeenReduced = pointDescription.pointsHaveBeenReduced
    const kPointSizeReductionFactor = 0.5
    const getLegendColor = legendAttrID ? dataConfiguration?.getLegendColorForCase : undefined

    // Remove all existing connecting lines before rendering new ones to prevent duplicates
    if (connectingLinesRef.current) {
      const connectingLinesArea = select(connectingLinesRef.current)
      connectingLinesArea.selectAll("path").remove()
    }

    cellKeys?.forEach((cellKey) => {
      renderConnectingLines({
        cellKey, connectingLines, getLegendColor, parentAttrID, parentAttrName, pointColorAtIndex,
        showConnectingLines: showLines
      })
    })

    // Decrease point size when Connecting Lines are first activated so the lines are easier to see, and
    // revert to original point size when Connecting Lines are deactivated.
    if (!connectingLinesActivatedRef.current && showLines && !pointsHaveBeenReduced) {
      pointDescription.setPointSizeMultiplier(pointSizeMultiplier * kPointSizeReductionFactor)
      pointDescription.setPointsHaveBeenReduced(true)
    } else if (!showLines && pointsHaveBeenReduced) {
      pointDescription.setPointSizeMultiplier(pointSizeMultiplier / kPointSizeReductionFactor)
      pointDescription.setPointsHaveBeenReduced(false)
    }
  }, [layout, dataConfiguration, dataset, legendAttrID, renderConnectingLines, graphModel])

  const refreshSquares = useCallback(() => {

    const { residualSquaresForLines, residualSquaresForFunction } = scatterPlotFuncs(layout, dataConfiguration)

    const doUpdateSquares = (squaresElement: SVGElement | null, squares: ISquareOfResidual[], stroke: string) => {
      const strokeFunc = stroke ? () => stroke
        : (d: ISquareOfResidual) => d.color && d.color !== "" ? d.color : "#008000"
      select(squaresElement).selectAll("*")
        .data(squares)
        .join("rect")
        .attr("x", (d: ISquareOfResidual) => d.x)
        .attr("y", (d: ISquareOfResidual) => d.y)
        .attr("width", (d: ISquareOfResidual) => d.side)
        .attr("height", (d: ISquareOfResidual) => d.side)
        .attr("fill", "none")
        .attr("stroke", strokeFunc)
    }

    if (lsrl?.isVisible) {
      const lsrlLineDescriptions = lsrl.lineDescriptions
      const lsrlSquares: ISquareOfResidual[] = residualSquaresForLines(lsrlLineDescriptions)
      doUpdateSquares(lsrlSquaresRef.current, lsrlSquares, "")
    }

    if (movableLine?.isVisible) {
      const mlLineDescriptions = movableLine.lineDescriptions
      const mlSquares: ISquareOfResidual[] = residualSquaresForLines(mlLineDescriptions)
      doUpdateSquares(movableLineSquaresRef.current, mlSquares, "#4682b4")
    }

    if (plottedFunctionModel?.isVisible) {
      const caseSubsetDescriptions = dataConfiguration?.getAllCaseSubsetDescriptions() || []
      const funcSquares: ISquareOfResidual[] = residualSquaresForFunction(plottedFunctionModel, caseSubsetDescriptions)
      doUpdateSquares(functionSquaresRef.current, funcSquares, "#4682b4")
    }

  }, [lsrl, movableLine, dataConfiguration, layout, plottedFunctionModel])

  const refreshAllPointPositions = useCallback((selectedOnly: boolean) => {
    const {getXCoord: getScreenX, getYCoord: getScreenY} = scatterPlotFuncs(layout, dataConfiguration),
      {pointColor, pointStrokeColor} = graphModel.pointDescription,
      getLegendColor = legendAttrID ? dataConfiguration?.getLegendColorForCase : undefined

    setPointCoordinates({
      dataset, renderer, pointRadius: graphModel.getPointRadius(),
      selectedPointRadius: selectedPointRadiusRef.current,
      selectedOnly, getScreenX, getScreenY, getLegendColor,
      getPointColorAtIndex: graphModel.pointDescription.pointColorAtIndex,
      pointColor, pointStrokeColor, getAnimationEnabled: isAnimating
    })
  }, [dataConfiguration, graphModel, layout, legendAttrID, dataset, renderer, isAnimating])

  const refreshPointPositionsPerfMode = useCallback((selectedOnly: boolean) => {
    if (!renderer) {
      return
    }
    const {joinedCaseDataArrays, selection} = dataConfiguration || {},
      numberOfPlots = dataConfiguration?.numberOfPlots || 1
    const {getXCoord: getScreenX, getYCoord: getScreenY} = scatterPlotFuncs(layout, dataConfiguration)
    const updateDot = (aCaseData: CaseData) => {
      const caseId = aCaseData.caseID
      const x = getScreenX(caseId)
      const y = getScreenY(caseId, aCaseData.plotNum)
      if (x != null && isFinite(x) && y != null && isFinite(y)) {
        const point = renderer.getPointForCaseData(aCaseData)
        point && renderer.setPointPosition(point, x, y)
      }
    }
    if (selectedOnly) {
      selection?.forEach(caseId => {
        for (let plotNum = 0; plotNum < numberOfPlots; plotNum++) {
          updateDot({plotNum, caseID: caseId})
        }
      })
    } else {
      joinedCaseDataArrays?.forEach((aCaseData) => updateDot(aCaseData))
    }
  }, [renderer, dataConfiguration, layout])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    // Read showConnectingLines directly from store to avoid stale closure issues
    refreshConnectingLines(adornmentsStore.showConnectingLines)
    if (appState.isPerformanceMode) {
      refreshPointPositionsPerfMode(selectedOnly)
    } else {
      refreshAllPointPositions(selectedOnly)
    }
    showSquares && refreshSquares()
    // Piggyback residual-point refresh here so live drag updates flow through. During drag the
    // dataset is caching (setCaseValues writes only to the cache, which is a plain JS Map — reads
    // don't establish MobX deps, so our mstAutorun doesn't re-fire). usePlotResponders wires an
    // onAnyAction listener that calls refreshPointPositions on every setCaseValues, so this path
    // fires per drag frame and reads current cached values via renderResidualsIfActive.
    renderResidualsIfActive()
  }, [adornmentsStore, refreshConnectingLines, refreshSquares,
      refreshPointPositionsPerfMode, refreshAllPointPositions, renderResidualsIfActive, showSquares])

  // Call refreshSquares when Squares of Residuals option is switched on and when a
  // Movable Line adornment is being dragged.
  useEffect(function updateSquares() {
    return mstAutorun(() => {
      if (adornmentsStore.showSquaresOfResiduals) {
        refreshSquares()
      }
    }, { name: "ScatterDots.updateSquares" }, graphModel)
    // showSquaresOfResiduals is observed inside the autorun, so it's intentionally not an effect
    // dependency — keeping it here would recreate the mstAutorun on every toggle, accumulating
    // no-op addDisposer entries on graphModel until it's destroyed.
  }, [adornmentsStore, graphModel, refreshSquares])

  // The squares <g> elements are conditionally mounted (only while shown), so their refs attach
  // after React commits. The updateSquares mstAutorun fires synchronously when showSquaresOfResiduals
  // flips — before those refs exist — so it draws into a null ref on the toggle-on / show-adornment
  // transition. This post-commit effect redraws once the <g> is mounted. (Steady-state updates such
  // as dragging a line keep flowing through the mstAutorun, whose <g> is already mounted.)
  useEffect(function drawSquaresAfterMount() {
    if (showSquares) refreshSquares()
  }, [showSquares, movableLine?.isVisible, lsrl?.isVisible, plottedFunctionModel?.isVisible, refreshSquares])

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

  // Call refreshConnectingLines when Connecting Lines option is switched on and when all
  // points are selected.
  // NOTE: We observe adornmentsStore.showConnectingLines directly inside the autorun to ensure
  // we always get the current value, rather than relying on closures which can become stale
  // during rapid state changes (e.g., during undo when renderer is also changing).
  useEffect(function updateConnectingLines() {
    return mstAutorun(() => {
      // Read showConnectingLines directly from store inside autorun to create a reactive dependency
      const currentShowConnectingLines = adornmentsStore.showConnectingLines
      // Observe selection inside the autorun (rather than via the effect dependencies) so the lines
      // restyle on selection change without tearing down and reinstalling the autorun each time.
      // (drawConnectingLines styles selected lines, so the lines genuinely depend on selection.)
      // Only observe it when lines are shown: when hidden, selection has no effect on rendering, so
      // tracking it would just cause wasted reruns (incl. the O(N) selection computation).
      if (currentShowConnectingLines) {
        dataConfiguration?.selection // eslint-disable-line @typescript-eslint/no-unused-expressions
      }
      refreshConnectingLines(currentShowConnectingLines)
    }, { name: "ScatterDots.updateConnectingLines" }, graphModel)
  }, [adornmentsStore, dataConfiguration, graphModel, refreshConnectingLines])

  usePlotResponders({renderer, refreshPointPositions, refreshPointSelection})

  return (
    <>
      <defs>
        <clipPath id={`plot-clip-${instanceId}`}>
          <rect width={layout.plotWidth} height={layout.plotHeight} />
        </clipPath>
        <If condition={layout.showLowerPlot}>
          <clipPath id={`plot-clip-lower-${instanceId}`}>
            {/* Positioned at the top of the lower region within the plot-area SVG (whose origin is
                the upper region's top-left), so consumers rendering at y = plotHeight + Δ fall
                inside the clip. Width matches the plot area for the same reason. */}
            <rect x={0} y={layout.plotHeight}
                  width={layout.getLowerPlotBounds().width}
                  height={layout.getLowerPlotBounds().height} />
          </clipPath>
        </If>
      </defs>
      <g
        className="connecting-lines"
        clipPath={`url(#plot-clip-${instanceId})`}
        data-testid={`connecting-lines-${instanceId}`}
        ref={connectingLinesRef}
      />
      <svg/>
      { movableLine?.isVisible && showSquares &&
        <g
          data-testid={`movable-line-squares-${instanceId}`}
          className="movable-line-squares"
          ref={movableLineSquaresRef}
        />
      }
      { lsrl?.isVisible && showSquares &&
        <g
          data-testid={`lsrl-squares-${instanceId}`}
          className="lsrl-squares"
          ref={lsrlSquaresRef}
        />
      }
      <If condition={layout.showLowerPlot}>
        {/* Transparent background rect for the lower plot region. Captures clicks in the residual
            plot's white space and deselects all cases (unless a modifier key is held), mirroring
            the upper plot's background behavior wired via useRendererPointerDownDeselect. */}
        <rect
          data-testid={`residual-plot-background-${instanceId}`}
          className="residual-plot-background"
          x={0}
          y={layout.plotHeight}
          width={layout.getLowerPlotBounds().width}
          height={layout.getLowerPlotBounds().height}
          fill="transparent"
          onClick={(event) => {
            if (!event.shiftKey && !event.metaKey && !event.ctrlKey && dataset) {
              selectAllCases(dataset, false)
            }
          }}
        />
        <g
          data-testid={`residual-points-${instanceId}`}
          className="residual-points"
          clipPath={`url(#plot-clip-lower-${instanceId})`}
          ref={residualPointsRef}
        />
      </If>
      { plottedFunctionModel?.isVisible && showSquares &&
        <g
          data-testid={`function-squares-${instanceId}`}
          className="function-squares"
          ref={functionSquaresRef}
        />
      }
    </>
  )
})
