import {ScaleLinear, select} from "d3"
import { tip as d3tip } from "d3-v6-tip"
import { autorun, untracked } from "mobx"
import { observer } from "mobx-react-lite"
import {useCallback, useEffect, useRef, useState} from "react"
import { useMemo } from "use-memo-one"
import {useDataSetContext} from "../../../../hooks/use-data-set-context"
import {useInstanceIdContext} from "../../../../hooks/use-instance-id-context"
import {appState} from "../../../../models/app-state"
import {ICase} from "../../../../models/data/data-set-types"
import {
  firstVisibleParentAttribute, idOfChildmostCollectionForAttributes, selectCases, setSelectedCases
} from "../../../../models/data/data-set-utils"
import { t } from "../../../../utilities/translation/translate"
import {ScaleNumericBaseType} from "../../../axis/axis-types"
import { getDomainExtentForPixelWidth } from "../../../axis/axis-utils"
import { CaseData } from "../../../data-display/d3-types"
import { ID3Tip } from "../../../data-display/data-display-types"
import { handleClickOnCase, setPointSelection } from "../../../data-display/data-display-utils"
import { dataDisplayGetNumericValue } from "../../../data-display/data-display-value-utils"
import {
  ConnectingLines, IConnectingLinesRenderInput
} from "../../../data-display/models/connecting-lines"
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
import { scatterPlotFuncs, connectingLinesSignature } from "./scatter-plot-utils"

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

  const connectingLinesRef = useRef<SVGGElement>(null)
  const connectingLinesActivatedRef = useRef(false)

  // The ConnectingLines instance persists across renders; it owns the line DOM and the coord cache.
  const connectingLinesInstanceRef = useRef<ConnectingLines>()
  if (!connectingLinesInstanceRef.current) connectingLinesInstanceRef.current = new ConnectingLines()
  useEffect(() => () => connectingLinesInstanceRef.current?.destroy(), [])

  // useMemo from use-memo-one (stable, lifetime-guaranteed) so the d3-tip is created exactly once
  // rather than re-evaluated on every render (which would build a throwaway tip per streamed case).
  const dataTip = useMemo<ID3Tip>(() =>
    d3tip().attr("class", "graph-d3-tip").attr("data-testid", "graph-connecting-lines-data-tip")
      .html((d: string) => `<p>${d}</p>`)
  , [])

  const handleConnectingLinesClick = useCallback((event: MouseEvent, caseIDs: string[]) => {
    const linesPath = event.target && select(event.target as HTMLElement)
    if (linesPath) {
      const areLineCasesSelected = caseIDs.every(caseID => dataset?.isCaseSelected(caseID))
      if (areLineCasesSelected || event.shiftKey) {
        selectCases(caseIDs, dataset, !areLineCasesSelected)
      } else {
        setSelectedCases(caseIDs, dataset)
      }
    }
  }, [dataset])

  const handleConnectingLinesMouseOver = useCallback(
    (args: { event: MouseEvent, caseIds: string[], parentAttrName?: string, primaryAttrValue?: string }) => {
      const { event, caseIds, parentAttrName, primaryAttrValue } = args
      if (renderer?.canvas) renderer.canvas.style.cursor = "pointer"
      if (!parentAttrName || !primaryAttrValue) return
      const datasetName = dataset?.displayTitle ?? ""
      const vars = [parentAttrName, primaryAttrValue, caseIds?.length ?? 0, datasetName]
      dataTip.show(t("DG.DataTip.connectingLine", { vars }), event.target)
    }, [dataTip, dataset, renderer])

  const handleConnectingLinesMouseOut = useCallback(() => {
    if (renderer?.canvas) renderer.canvas.style.cursor = ""
    dataTip.hide()
  }, [dataTip, renderer])

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

  const refreshPointSelection = useCallback(() => {
    const {pointColor, pointStrokeColor} = graphModel.pointDescription
    dataConfiguration && setPointSelection(
      {
        renderer, dataConfiguration, pointRadius: graphModel.getPointRadius(),
        selectedPointRadius: selectedPointRadiusRef.current,
        pointColor, pointStrokeColor, getPointColorAtIndex: graphModel.pointDescription.pointColorAtIndex
      })
  }, [dataConfiguration, graphModel, renderer])

  // Assembles the plain-data render input the ConnectingLines class consumes. The class decides
  // whether to recompute all coordinates or only the newly appended ones (streaming fast path).
  const buildConnectingLinesInput = useCallback(
    (showLines: boolean, animateChange: boolean): IConnectingLinesRenderInput | undefined => {
      if (!connectingLinesRef.current) return undefined
      const funcs = scatterPlotFuncs(layout, dataConfiguration)
      const childmostCollectionId =
        idOfChildmostCollectionForAttributes(dataConfiguration?.attributes ?? [], dataset)
      const parentAttr = firstVisibleParentAttribute(dataset, childmostCollectionId)
      const cellKeys = dataConfiguration?.getAllCellKeys()
      const pointDescription = graphModel.pointDescription
      const getLegendColor = legendAttrID ? dataConfiguration?.getLegendColorForCase : undefined
      return {
        svg: connectingLinesRef.current,
        clientType: "graph",
        showConnectingLines: showLines,
        animateChange,
        caseList: dataConfiguration?.getCaseDataArray(0) ?? [],
        scaleSignature: connectingLinesSignature(layout, dataConfiguration, parentAttr?.id, cellKeys),
        getLineForCase: (caseID: string, plotNum: number) => funcs.connectingLine(caseID, plotNum),
        classify: {
          parentAttrID: parentAttr?.id, parentAttrName: parentAttr?.name,
          yAttrCount: dataConfiguration?.yAttributeIDs?.length ?? 0, cellKeys,
          isCaseInSubPlot: (cellKey, caseData) => !!dataConfiguration?.isCaseInSubPlot(cellKey, caseData)
        },
        style: {
          getGroupColor: (group) => {
            const legendColor = group.firstCaseId ? getLegendColor?.(group.firstCaseId) : undefined
            return legendColor ?? pointDescription.pointColorAtIndex(group.plotNum || 0)
          },
          isCaseSelected: (id) => !!dataset?.isCaseSelected(id)
        },
        handlers: {
          onClick: handleConnectingLinesClick,
          onMouseOver: handleConnectingLinesMouseOver,
          onMouseOut: handleConnectingLinesMouseOut
        },
        dataTip
      }
    }, [layout, dataConfiguration, dataset, graphModel, legendAttrID, dataTip,
        handleConnectingLinesClick, handleConnectingLinesMouseOver, handleConnectingLinesMouseOut])

  // Accept showLines parameter to avoid stale closure issues during rapid state changes
  const refreshConnectingLines = useCallback((showLines: boolean) => {
    if (!showLines && !connectingLinesActivatedRef.current) return
    const instance = connectingLinesInstanceRef.current
    // Only fade the lines in/out when the shown state actually changes (a user show/hide toggle);
    // streaming adds keep showLines unchanged and must not restart the fade.
    const wasActivated = connectingLinesActivatedRef.current
    const input = buildConnectingLinesInput(showLines, wasActivated !== showLines)
    if (!instance || !input) return

    instance.render(input)

    // Decrease point size when Connecting Lines are first activated so the lines are easier to see, and
    // revert to original point size when Connecting Lines are deactivated.
    const pointDescription = graphModel.pointDescription
    const pointSizeMultiplier = pointDescription.pointSizeMultiplier
    const pointsHaveBeenReduced = pointDescription.pointsHaveBeenReduced
    const kPointSizeReductionFactor = 0.5
    if (!wasActivated && showLines && !pointsHaveBeenReduced) {
      pointDescription.setPointSizeMultiplier(pointSizeMultiplier * kPointSizeReductionFactor)
      pointDescription.setPointsHaveBeenReduced(true)
    } else if (!showLines && pointsHaveBeenReduced) {
      pointDescription.setPointSizeMultiplier(pointSizeMultiplier / kPointSizeReductionFactor)
      pointDescription.setPointsHaveBeenReduced(false)
    }

    // Update synchronously so subsequent refreshes — including streamed adds that arrive mid-fade —
    // are treated as non-animated updates.
    connectingLinesActivatedRef.current = showLines
  }, [buildConnectingLinesInput, graphModel])

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
  }, [adornmentsStore, showSquares, refreshConnectingLines, refreshSquares, refreshPointPositionsPerfMode,
      refreshAllPointPositions])

  // Call refreshSquares when Squares of Residuals option is switched on and when a
  // Movable Line adornment is being dragged.
  useEffect(function updateSquares() {
    return autorun(() => {
      if (adornmentsStore.showSquaresOfResiduals) {
        refreshSquares()
      }
    }, { name: "ScatterDots.updateSquares" })
  }, [adornmentsStore.showSquaresOfResiduals, refreshSquares])

  // Show/hide toggle: full render (with fade). Observe only showConnectingLines — adding a case must
  // not rebuild lines from here (that caused ~4x O(N) rebuilds per streamed case); per-add updates
  // flow through the rAF-coalesced refreshPointPositions path. The render reads case positions, so
  // run it untracked to keep this autorun from subscribing to them.
  useEffect(function updateConnectingLines() {
    return autorun(() => {
      const currentShowConnectingLines = adornmentsStore.showConnectingLines
      untracked(() => refreshConnectingLines(currentShowConnectingLines))
    }, { name: "ScatterDots.updateConnectingLines" })
  }, [adornmentsStore, refreshConnectingLines])

  // Selection change while shown: restyle existing lines only (no coordinate recompute / geometry).
  useEffect(function restyleConnectingLinesSelection() {
    return autorun(() => {
      void dataConfiguration?.dataset?.selectionChanges
      untracked(() => {
        if (!adornmentsStore.showConnectingLines || !connectingLinesRef.current) return
        connectingLinesInstanceRef.current?.restyleSelection({
          svg: connectingLinesRef.current,
          showConnectingLines: true,
          // Read selection from the same dataset we subscribe to above, so the observed and read
          // targets stay aligned even if dataConfiguration.dataset transiently differs from context.
          style: { isCaseSelected: (id) => !!dataConfiguration?.dataset?.isCaseSelected(id) }
        })
      })
    }, { name: "ScatterDots.restyleConnectingLinesSelection" })
  }, [adornmentsStore, dataConfiguration])

  usePlotResponders({renderer, refreshPointPositions, refreshPointSelection})

  return (
    <>
      <defs>
        <clipPath id={`plot-clip-${instanceId}`}>
          <rect width={layout.plotWidth} height={layout.plotHeight} />
        </clipPath>
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
