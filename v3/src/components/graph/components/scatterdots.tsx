import * as PIXI from "pixi.js"
import {ScaleLinear, curveLinear, line, select} from "d3"
import React, {useCallback, useEffect, useRef, useState} from "react"
import {tip as d3tip} from "d3-v6-tip"
import { autorun } from "mobx"
import { observer } from "mobx-react-lite"
import { t } from "../../../utilities/translation/translate"
import {appState} from "../../../models/app-state"
import {ScaleNumericBaseType} from "../../axis/axis-types"
import {CaseData} from "../../data-display/d3-types"
import {PlotProps} from "../graphing-types"
import {handleClickOnCase, setPointSelection} from "../../data-display/data-display-utils"
import {useDataDisplayAnimation} from "../../data-display/hooks/use-data-display-animation"
import {getScreenCoord, setPointCoordinates} from "../utilities/graph-utils"
import {useGraphContentModelContext} from "../hooks/use-graph-content-model-context"
import {useGraphDataConfigurationContext} from "../hooks/use-graph-data-configuration-context"
import {useGraphLayoutContext} from "../hooks/use-graph-layout-context"
import {usePixiDragHandlers, usePlotResponders} from "../hooks/use-plot"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {ICase} from "../../../models/data/data-set-types"
import {ISquareOfResidual} from "../adornments/shared-adornment-types"
import {IConnectingLineDescription, scatterPlotFuncs} from "./scatter-plot-utils"
import {IPixiPointMetadata, PixiBackgroundPassThroughEvent} from "../utilities/pixi-points"
import { transitionDuration } from "../../data-display/data-display-types"

export const ScatterDots = observer(function ScatterDots(props: PlotProps) {
  const {pixiPoints} = props,
    graphModel = useGraphContentModelContext(),
    instanceId = useInstanceIdContext(),
    dataConfiguration = useGraphDataConfigurationContext(),
    {isAnimating, startAnimation, stopAnimation} = useDataDisplayAnimation(),
    dataset = useDataSetContext(),
    secondaryAttrIDsRef = useRef<string[]>([]),
    pointRadiusRef = useRef(0),
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
    pointSizeMultiplier = graphModel.pointDescription.pointSizeMultiplier,
    origPointSizeMultiplier = useRef(pointSizeMultiplier)

  // The Squares of Residuals option is controlled by the AdornmentsStore, so we need to watch for changes to that store
  // and call refreshSquares when the option changes. The squares are rendered in connection with the Movable Line and
  // LSRL adornments, so we need to get information from those adornments as well.
  const adornmentsStore = graphModel.adornmentsStore
  const showSquares = adornmentsStore.showSquaresOfResiduals
  const movableLine = adornmentsStore.adornments.find(a => a.type === "Movable Line")
  const lsrl = adornmentsStore.adornments.find(a => a.type === "LSRL")
  const movableLineSquaresRef = useRef<SVGGElement>(null)
  const lsrlSquaresRef = useRef<SVGGElement>(null)

  // The Connecting Lines option is controlled by the AdornmentsStore, so we need to watch for changes to that store
  // and call refreshConnectingLines when the option changes. Unlike the Squares of Residuals, the lines are not
  // rendered in connection with any other adornments.
  const showConnectingLines = adornmentsStore.showConnectingLines
  const connectingLinesRef = useRef<SVGGElement>(null)
  const connectingLinesActivatedRef = useRef(false)

  secondaryAttrIDsRef.current = dataConfiguration?.yAttributeIDs || []
  pointRadiusRef.current = graphModel.getPointRadius()
  selectedPointRadiusRef.current = graphModel.getPointRadius('select')
  dragPointRadiusRef.current = graphModel.getPointRadius('hover-drag')
  yScaleRef.current = layout.getAxisScale("left") as ScaleNumericBaseType

  const onDragStart = useCallback((event: PointerEvent, point: PIXI.Sprite, metadata: IPixiPointMetadata) => {
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
        x: dataset?.getNumeric(anID, xAttrID) ?? 0,
        y: dataset?.getNumeric(anID, secondaryAttrIDsRef.current[plotNumRef.current]) ?? 0
      }
    })
  }, [dataConfiguration, dataset, stopAnimation])

  const onDrag = useCallback((event: PointerEvent) => {
    const xAxisScale = layout.getAxisScale('bottom') as ScaleLinear<number, number>
    const xAttrID = dataConfiguration?.attributeID('x') ?? ''
    if (dragID !== '') {
      const newPos = { x: event.clientX, y: event.clientY }
      const dx = newPos.x - currPos.current.x
      const dy = newPos.y - currPos.current.y
      currPos.current = newPos
      if (dx !== 0 || dy !== 0) {
        didDrag.current = true
        const deltaX = Number(xAxisScale.invert(dx)) - Number(xAxisScale.invert(0)),
          deltaY = Number(yScaleRef.current?.invert(dy)) - Number(yScaleRef.current?.invert(0)),
          caseValues: ICase[] = [],
          { selection } = dataConfiguration || {}
        selection?.forEach(anID => {
          const currX = Number(dataset?.getNumeric(anID, xAttrID)),
            currY = Number(dataset?.getNumeric(anID, secondaryAttrIDsRef.current[plotNumRef.current]))
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
        pixiPoints, dataConfiguration, pointRadius: pointRadiusRef.current,
        selectedPointRadius: selectedPointRadiusRef.current,
        pointColor, pointStrokeColor, getPointColorAtIndex: graphModel.pointDescription.pointColorAtIndex
      })
  }, [dataConfiguration, graphModel, pixiPoints])

  const handleConnectingLinesClick = useCallback((event: MouseEvent, caseIDs: string[]) => {
    const linesPath = event.target && select(event.target as HTMLElement)
    if (linesPath?.classed("selected")) {
      linesPath?.classed("selected", false)
      linesPath?.attr("stroke-width", 2)
      dataset?.setSelectedCases([])
    } else {
      linesPath?.classed("selected", true)
      linesPath?.attr("stroke-width", 4)
      dataset?.setSelectedCases(caseIDs)
    }
  }, [dataset])

  const dataTip = d3tip().attr("class", "graph-d3-tip")
    .attr("data-testid", "graph-connecting-lines-data-tip")
    .html((d: string) => {
      return `<p>${d}</p>`
    })

  const handleConnectingLinesMouseOver = useCallback((
    event: MouseEvent, caseIDs: string[], parentAttrName?: string, parentAttrValue?: string
  ) => {
    if (pixiPoints) {
      pixiPoints.canvas.style.cursor = "pointer"
    }
    // TODO: In V2, the tool tip is only shown when there is a parent attribute. V3 should always show the tool tip,
    // but the text needs to be different when there is no parent attribute. We'll need to work out how to handle the
    // localization for this. When a parent attribute is present, the tool tip should look like:
    //   <category attribute name>: <category>
    //   with <number of points> points (<collection name>) on this line
    // And when a parent attribute is not present, the tool tip should look like:
    //   <number of points> points (<collection name>) on this line
    if (!parentAttrName || !parentAttrValue) return // For now, do nothing if these are undefined
    const caseIdCount = caseIDs?.length ?? 0
    const datasetName = dataset?.name ?? ""
    const vars = [parentAttrName, parentAttrValue, caseIdCount, datasetName]
    const dataTipContent = t("DG.DataTip.connectingLine", {vars})
    dataTip.show(dataTipContent, event.target)
  }, [dataTip, dataset?.name, pixiPoints])

  const handleConnectingLinesMouseOut = useCallback(() => {
    if (pixiPoints) {
      pixiPoints.canvas.style.cursor = ""
    }
    dataTip.hide()
  }, [dataTip, pixiPoints])

  const refreshConnectingLines = useCallback(async () => {
    if (!showConnectingLines && !connectingLinesActivatedRef.current) return

    const connectingLinesArea = select(connectingLinesRef.current)
    const curve = line().curve(curveLinear)
    const { connectingLinesForCases } = scatterPlotFuncs(layout, dataConfiguration)
    const connectingLines = connectingLinesForCases()
    const parentAttr = dataset?.collections[0]?.attributes[0]
    const parentAttrID = parentAttr?.id
    const parentAttrName = parentAttr?.name
    const parentAttrValues = parentAttrID && dataConfiguration?.metadata?.getCategorySet(parentAttrID)?.values
    const cellKeys = dataConfiguration?.getAllCellKeys()

    connectingLinesArea.selectAll("path").remove()
    cellKeys?.forEach((cellKey) => {
      // Each plot can have multiple groups of connecting lines. The number of groups is determined by the number of Y
      // attributes or the presence of a parent attribute and the number of unique values for that attribute. If there
      // are multiple Y attributes, the number of groups matches the number of Y attributes. Otherwise, if there's a
      // parent attribute, the number of groups matches the number of unique values for that attribute. If there's only
      // one Y attribute and no parent attribute, then there's a only single group. The code below builds lists of
      // connecting lines and case IDs for each group.
      const lineGroups: Record<string, IConnectingLineDescription[]> = {}
      const allLineCaseIds: Record<string, string[]> = {}
      const yAttrCount = dataConfiguration?.yAttributeIDs?.length ?? 0
      connectingLines.forEach((lineDescription: IConnectingLineDescription) => {
        const parentAttrValue = parentAttrID ? String(lineDescription.caseData[parentAttrID]) : undefined
        const groupKey = yAttrCount > 1
          ? lineDescription.plotNum
          : parentAttrValues && parentAttrValue
            ? parentAttrValue
            : 0

        if (dataConfiguration?.isCaseInSubPlot(cellKey, lineDescription.caseData)) {
          lineGroups[groupKey] ||= []
          allLineCaseIds[groupKey] ||= []
          lineGroups[groupKey].push(lineDescription)
          allLineCaseIds[groupKey].push(lineDescription.caseData.__id__)
        }
      })

      // For each group of lines, draw a path using the lines' coordinates
      for (const [linesIndex, [primaryAttrValue, cases]] of Object.entries(lineGroups).entries()) {
        const allLineCoords = cases.map((l) => l.lineCoords)
        const lineCaseIds = allLineCaseIds[primaryAttrValue]
        const allCasesSelected = lineCaseIds?.every(caseID => dataConfiguration?.selection.includes(caseID))
        const legendID = dataConfiguration?.attributeID("legend")
        const color = parentAttrID && legendID
          ? graphModel.pointDescription.pointColorAtIndex(linesIndex)
          : graphModel.pointDescription.pointColorAtIndex(0)

        connectingLinesArea
          .append("path")
          .data([allLineCoords])
          .attr("d", d => curve(d))
          .classed("interactive-graph-element", true) // for dots canvas event passing
          .classed("selected", allCasesSelected)
          .on(PixiBackgroundPassThroughEvent.Click, (e) => handleConnectingLinesClick(e, lineCaseIds))
          .on(PixiBackgroundPassThroughEvent.MouseOver, (e) =>
            handleConnectingLinesMouseOver(e, lineCaseIds, parentAttrName, primaryAttrValue)
          )
          .on(PixiBackgroundPassThroughEvent.MouseOut, handleConnectingLinesMouseOut)
          .call(dataTip)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", allCasesSelected ? 4 : 2)
          .style("cursor", "pointer")
          .style("opacity", connectingLinesActivatedRef.current ? 1 : 0)
          .transition()
          .duration(transitionDuration)
          .style("opacity", showConnectingLines ? 1 : 0)
          .on("end", () => {
            connectingLinesActivatedRef.current = showConnectingLines
            !showConnectingLines && select(connectingLinesRef.current).selectAll("path").remove()
          })
      }
    })
    // Decrease point size when Connecting Lines are first activated so the lines are easier to see, and
    // revert to original point size when Connecting Lines are deactivated.
    if (!connectingLinesActivatedRef.current && showConnectingLines && pointSizeMultiplier > .5) {
      origPointSizeMultiplier.current = pointSizeMultiplier
      await pixiPoints?.setAllPointsScale(.5, transitionDuration)
      graphModel.pointDescription.setPointSizeMultiplier(pointSizeMultiplier * .5)
    } else if (!showConnectingLines) {
      const scaleFactor = origPointSizeMultiplier.current / pointSizeMultiplier
      await pixiPoints?.setAllPointsScale(scaleFactor, transitionDuration)
      graphModel.pointDescription.setPointSizeMultiplier(origPointSizeMultiplier.current)
    }
  }, [dataConfiguration, dataset?.collections, dataTip, graphModel.pointDescription,
      handleConnectingLinesClick, handleConnectingLinesMouseOut, handleConnectingLinesMouseOver, layout,
      pixiPoints, pointSizeMultiplier, showConnectingLines])

  const refreshSquares = useCallback(() => {

    const { residualSquaresForLines } = scatterPlotFuncs(layout, dataConfiguration)

    if (lsrl?.isVisible) {
      const lsrlLineDescriptions = lsrl.lineDescriptions
      const lsrlSquares: ISquareOfResidual[] = residualSquaresForLines(lsrlLineDescriptions)
      select(lsrlSquaresRef.current).selectAll("*")
        .data(lsrlSquares)
        .join("rect")
        .attr("id", (d: ISquareOfResidual) => `#${instanceId}-${d.caseID}-lsrl-square`)
        .attr("x", (d: ISquareOfResidual) => d.x)
        .attr("y", (d: ISquareOfResidual) => d.y)
        .attr("width", (d: ISquareOfResidual) => d.side)
        .attr("height", (d: ISquareOfResidual) => d.side)
        .attr("fill", "none")
        .attr("stroke", (d: ISquareOfResidual) => d.color && d.color !== "" ? d.color : "#008000")
    }

    if (movableLine?.isVisible) {
      const mlLineDescriptions = movableLine.lineDescriptions
      const mlSquares: ISquareOfResidual[] = residualSquaresForLines(mlLineDescriptions)
      select(movableLineSquaresRef.current).selectAll("*")
        .data(mlSquares)
        .join("rect")
        .attr("id", (d: ISquareOfResidual) => `#${instanceId}-${d.caseID}-ml-square`)
        .attr("x", (d: ISquareOfResidual) => d.x)
        .attr("y", (d: ISquareOfResidual) => d.y)
        .attr("width", (d: ISquareOfResidual) => d.side)
        .attr("height", (d: ISquareOfResidual) => d.side)
        .attr("fill", "none")
        .attr("stroke", "#4682b4")
    }

  }, [lsrl, movableLine, dataConfiguration, layout, instanceId])

  const refreshAllPointPositions = useCallback((selectedOnly: boolean) => {

    const {getXCoord: getScreenX, getYCoord: getScreenY} = scatterPlotFuncs(layout, dataConfiguration),
      {pointColor, pointStrokeColor} = graphModel.pointDescription,
      getLegendColor = legendAttrID ? dataConfiguration?.getLegendColorForCase : undefined

    setPointCoordinates({
      dataset, pixiPoints, pointRadius: pointRadiusRef.current,
      selectedPointRadius: selectedPointRadiusRef.current,
      selectedOnly, getScreenX, getScreenY, getLegendColor,
      getPointColorAtIndex: graphModel.pointDescription.pointColorAtIndex,
      pointColor, pointStrokeColor, getAnimationEnabled: isAnimating
    })
  }, [dataConfiguration, graphModel.pointDescription, layout, legendAttrID, dataset, pixiPoints, isAnimating])

  const refreshPointPositionsPerfMode = useCallback((selectedOnly: boolean) => {
    if (!pixiPoints) {
      return
    }
    const xAttrID = dataConfiguration?.attributeID('x') ?? '',
      {joinedCaseDataArrays, selection} = dataConfiguration || {},
      primaryAxisScale = layout.getAxisScale('bottom') as ScaleLinear<number, number>
    const updateDot = (aCaseData: CaseData) => {
      const caseId = aCaseData.caseID
      const x = primaryAxisScale && getScreenCoord(dataset, caseId, xAttrID, primaryAxisScale)
      const y = yScaleRef.current &&
        getScreenCoord(dataset, caseId, secondaryAttrIDsRef.current[aCaseData.plotNum], yScaleRef.current)
      if (x != null && isFinite(x) && y != null && isFinite(y)) {
        const point = pixiPoints.getPointByCaseId(caseId)
        pixiPoints.setPointPosition(point, x, y)
      }
    }
    if (selectedOnly) {
      selection?.forEach(caseId => updateDot({plotNum: 0, caseID: caseId}))
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
  useEffect(function renderSquares() {
    return autorun(() => {
      showSquares && refreshSquares()
    }, { name: "ScatterDots.renderSquares" })
  }, [refreshSquares, showSquares])

  // Call refreshConnectingLines when Connecting Lines option is switched on and when all
  // points are selected.
  useEffect(function renderConnectingLines() {
    return autorun(() => {
      refreshConnectingLines()
    }, { name: "ScatterDots.renderConnectingLines" })
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
    </>
  )
})
