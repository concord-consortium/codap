import {ScaleLinear, select} from "d3"
import { autorun } from "mobx"
import { observer } from "mobx-react-lite"
import * as PIXI from "pixi.js"
import React, {useCallback, useEffect, useRef, useState} from "react"
import {appState} from "../../../../models/app-state"
import {
  firstVisibleParentAttribute, idOfChildmostCollectionForAttributes
} from "../../../../models/data/data-set-utils"
import {ScaleNumericBaseType} from "../../../axis/axis-types"
import {CaseData} from "../../../data-display/d3-types"
import {IPlotProps} from "../../graphing-types"
import { handleClickOnCase, setPointSelection } from "../../../data-display/data-display-utils"
import { dataDisplayGetNumericValue } from "../../../data-display/data-display-value-utils"
import {useDataDisplayAnimation} from "../../../data-display/hooks/use-data-display-animation"
import {getScreenCoord, setPointCoordinates} from "../../utilities/graph-utils"
import {useGraphContentModelContext} from "../../hooks/use-graph-content-model-context"
import {useGraphDataConfigurationContext} from "../../hooks/use-graph-data-configuration-context"
import {useGraphLayoutContext} from "../../hooks/use-graph-layout-context"
import {usePixiDragHandlers, usePlotResponders} from "../../hooks/use-plot"
import {useDataSetContext} from "../../../../hooks/use-data-set-context"
import {useInstanceIdContext} from "../../../../hooks/use-instance-id-context"
import {ICase} from "../../../../models/data/data-set-types"
import { ILSRLAdornmentModel } from "../../adornments/lsrl/lsrl-adornment-model"
import { IMovableLineAdornmentModel } from "../../adornments/movable-line/movable-line-adornment-model"
import { IPlottedFunctionAdornmentModel } from "../../adornments/plotted-function/plotted-function-adornment-model"
import {ISquareOfResidual} from "../../adornments/shared-adornment-types"
import { kLSRLType } from "../../adornments/lsrl/lsrl-adornment-types"
import { kMovableLineType } from "../../adornments/movable-line/movable-line-adornment-types"
import { kPlottedFunctionType } from "../../adornments/plotted-function/plotted-function-adornment-types"
import { IPixiPointMetadata } from "../../../data-display/pixi/pixi-points"
import { useConnectingLines } from "../../../data-display/hooks/use-connecting-lines"
import { scatterPlotFuncs } from "./scatter-plot-utils"

export const ScatterPlot = observer(function ScatterPlot({ pixiPoints }: IPlotProps) {
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
    plotNumRef = useRef(0)

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

  // The Connecting Lines option is controlled by the AdornmentsStore, so we need to watch for changes to that store
  // and call refreshConnectingLines when the option changes. Unlike the Squares of Residuals, the lines are not
  // rendered in connection with any other adornments.
  const showConnectingLines = adornmentsStore.showConnectingLines
  const connectingLinesRef = useRef<SVGGElement>(null)
  const connectingLinesActivatedRef = useRef(false)

  const isCaseInSubPlot = useCallback((cellKey: Record<string, string>, caseData: Record<string, any>) => {
    return dataConfiguration?.isCaseInSubPlot(cellKey, caseData)
  }, [dataConfiguration])

  const { renderConnectingLines } = useConnectingLines({
    clientType: "graph", pixiPoints, connectingLinesSvg: connectingLinesRef.current, connectingLinesActivatedRef,
    yAttrCount: dataConfiguration?.yAttributeIDs?.length, isCaseInSubPlot
  })

  secondaryAttrIDsRef.current = dataConfiguration?.yAttributeIDs || []
  selectedPointRadiusRef.current = graphModel.getPointRadius('select')
  dragPointRadiusRef.current = graphModel.getPointRadius('hover-drag')
  yScaleRef.current = layout.getAxisScale("left") as ScaleNumericBaseType

  const onDragStart = useCallback((event: PointerEvent, _point: PIXI.Sprite, metadata: IPixiPointMetadata) => {
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
        const deltaX = Number(xAxisScale.invert(dx)) - Number(xAxisScale.invert(0)),
          deltaY = Number(yScaleRef.current?.invert(dy)) - Number(yScaleRef.current?.invert(0)),
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
  }, [layout, dataConfiguration, dataset, dragID])

  const onDragEnd = useCallback(() => {
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
    // These calls are moved to the end to ensure that transitions are not broken by all the points being
    // repositioned (default behavior when caching and perf mode is disabled).
    dataset?.endCaching()
    appState.endPerformance()
  }, [dataConfiguration, dataset, dragID, startAnimation])

  usePixiDragHandlers(pixiPoints, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    const {pointColor, pointStrokeColor} = graphModel.pointDescription
    dataConfiguration && setPointSelection(
      {
        pixiPoints, dataConfiguration, pointRadius: graphModel.getPointRadius(),
        selectedPointRadius: selectedPointRadiusRef.current,
        pointColor, pointStrokeColor, getPointColorAtIndex: graphModel.pointDescription.pointColorAtIndex
      })
  }, [dataConfiguration, graphModel, pixiPoints])

  const refreshConnectingLines = useCallback(async () => {
    if (!showConnectingLines && !connectingLinesActivatedRef.current) return
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

    cellKeys?.forEach((cellKey) => {
      renderConnectingLines({
        cellKey, connectingLines, parentAttrID, parentAttrName, pointColorAtIndex, showConnectingLines
      })
    })

    // Decrease point size when Connecting Lines are first activated so the lines are easier to see, and
    // revert to original point size when Connecting Lines are deactivated.
    if (!connectingLinesActivatedRef.current && showConnectingLines && !pointsHaveBeenReduced) {
      pointDescription.setPointSizeMultiplier(pointSizeMultiplier * kPointSizeReductionFactor)
      pointDescription.setPointsHaveBeenReduced(true)
    } else if (!showConnectingLines && pointsHaveBeenReduced) {
      pointDescription.setPointSizeMultiplier(pointSizeMultiplier / kPointSizeReductionFactor)
      pointDescription.setPointsHaveBeenReduced(false)
    }
  }, [showConnectingLines, layout, dataConfiguration, dataset, renderConnectingLines, graphModel])

  const refreshSquares = useCallback(() => {

    const { residualSquaresForLines, residualSquaresForFunction } = scatterPlotFuncs(layout, dataConfiguration)

    const doUpdateSquares = (squaresElement: SVGElement | null, squares: ISquareOfResidual[], stroke: string) => {
      const strokeFunc = stroke ? () => stroke
        : (d: ISquareOfResidual) => d.color && d.color !== "" ? d.color : "#008000"
      select(squaresElement).selectAll("*")
        .data(squares)
        .join("rect")
        .attr("id", (d: ISquareOfResidual) => `#${instanceId}-${d.caseID}-ml-square`)
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
      const funcs = plottedFunctionModel.plottedFunctions
      const func = funcs.get('{}')?.formulaFunction
      if (!func) return
      const caseSubsetDescriptions = dataConfiguration?.getAllCaseSubsetDescriptions() || []
      const funcSquares: ISquareOfResidual[] = residualSquaresForFunction(plottedFunctionModel, caseSubsetDescriptions)
      doUpdateSquares(functionSquaresRef.current, funcSquares, "#4682b4")
    }

  }, [lsrl, movableLine, dataConfiguration, layout, instanceId, plottedFunctionModel])

  const refreshAllPointPositions = useCallback((selectedOnly: boolean) => {

    const {getXCoord: getScreenX, getYCoord: getScreenY} = scatterPlotFuncs(layout, dataConfiguration),
      {pointColor, pointStrokeColor} = graphModel.pointDescription,
      getLegendColor = legendAttrID ? dataConfiguration?.getLegendColorForCase : undefined

    setPointCoordinates({
      dataset, pixiPoints, pointRadius: graphModel.getPointRadius(),
      selectedPointRadius: selectedPointRadiusRef.current,
      selectedOnly, getScreenX, getScreenY, getLegendColor,
      getPointColorAtIndex: graphModel.pointDescription.pointColorAtIndex,
      pointColor, pointStrokeColor, getAnimationEnabled: isAnimating
    })
  }, [dataConfiguration, graphModel, layout, legendAttrID, dataset, pixiPoints, isAnimating])

  const refreshPointPositionsPerfMode = useCallback((selectedOnly: boolean) => {
    if (!pixiPoints) {
      return
    }
    const xAttrID = dataConfiguration?.attributeID('x') ?? '',
      {joinedCaseDataArrays, selection} = dataConfiguration || {},
      primaryAxisScale = layout.getAxisScale('bottom') as ScaleLinear<number, number>,
      numberOfPlots = dataConfiguration?.numberOfPlots || 1
    const updateDot = (aCaseData: CaseData) => {
      const caseId = aCaseData.caseID
      const x = primaryAxisScale && getScreenCoord(dataset, caseId, xAttrID, primaryAxisScale)
      const y = yScaleRef.current &&
        getScreenCoord(dataset, caseId, secondaryAttrIDsRef.current[aCaseData.plotNum], yScaleRef.current)
      if (x != null && isFinite(x) && y != null && isFinite(y)) {
        const point = pixiPoints.getPointForCaseData(aCaseData)
        point && pixiPoints.setPointPosition(point, x, y)
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
  }, [pixiPoints, dataConfiguration, layout, dataset])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    refreshConnectingLines()
    if (appState.isPerformanceMode) {
      refreshPointPositionsPerfMode(selectedOnly)
    } else {
      refreshAllPointPositions(selectedOnly)
    }
    showSquares && refreshSquares()
  }, [showSquares, refreshConnectingLines, refreshSquares, refreshPointPositionsPerfMode, refreshAllPointPositions])

  // Call refreshSquares when Squares of Residuals option is switched on and when a
  // Movable Line adornment is being dragged.
  useEffect(function updateSquares() {
    return autorun(() => {
      if (adornmentsStore.showSquaresOfResiduals) {
        refreshSquares()
      }
    }, { name: "ScatterDots.updateSquares" })
  }, [adornmentsStore.showSquaresOfResiduals, refreshSquares])

  // Call refreshConnectingLines when Connecting Lines option is switched on and when all
  // points are selected.
  useEffect(function updateConnectingLines() {
    return autorun(() => {
      refreshConnectingLines()
    }, { name: "ScatterDots.updateConnectingLines" })
  }, [dataConfiguration?.selection, refreshConnectingLines, showConnectingLines])

  usePlotResponders({pixiPoints, refreshPointPositions, refreshPointSelection})

  return (
    <>
      <g data-testid={`connecting-lines-${instanceId}`} className="connecting-lines" ref={connectingLinesRef}/>
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
