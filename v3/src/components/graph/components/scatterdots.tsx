import {ScaleBand, ScaleLinear, select} from "d3"
import React, {useCallback, useEffect, useRef, useState} from "react"
import { autorun } from "mobx"
import { observer } from "mobx-react-lite"
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
import {useDragHandlers, usePlotResponders} from "../hooks/use-plot"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {ICase} from "../../../models/data/data-set-types"
import {ISquareOfResidual} from "../adornments/movable-line/movable-line-adornment-types"

export const ScatterDots = observer(function ScatterDots(props: PlotProps) {
  const {dotsRef} = props,
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
    target = useRef<any>(),
    selectedDataObjects = useRef<Record<string, { x: number, y: number }>>({}),
    plotNumRef = useRef(0)

  secondaryAttrIDsRef.current = dataConfiguration?.yAttributeIDs || []
  pointRadiusRef.current = graphModel.getPointRadius()
  selectedPointRadiusRef.current = graphModel.getPointRadius('select')
  dragPointRadiusRef.current = graphModel.getPointRadius('hover-drag')
  yScaleRef.current = layout.getAxisScale("left") as ScaleNumericBaseType

  // The Squares of Residuals option is controlled by the AdornmentsStore, so we need to watch for changes to that store
  // and call refreshSquares when the option changes. The squares are rendered in connection with the Movable Line and
  // LSRL adornments, so we need to get information from those adrornments as well.
  const adornmentsStore = graphModel.adornmentsStore
  const showSquares = adornmentsStore.showSquaresOfResiduals
  const movableLine = adornmentsStore.adornments.find(a => a.type === "Movable Line")
  const lsrl = adornmentsStore.adornments.find(a => a.type === "LSRL")
  const movableLineSquaresRef = useRef<SVGGElement>(null)
  const lsrlSquaresRef = useRef<SVGGElement>(null)

  const onDragStart = useCallback((event: MouseEvent) => {
      target.current = select(event.target as SVGSVGElement)
      const aCaseData: CaseData = target.current.node().__data__
      if (!aCaseData) return
      dataset?.beginCaching()
      secondaryAttrIDsRef.current = dataConfiguration?.yAttributeIDs || []
      stopAnimation() // We don't want to animate points until end of drag
      didDrag.current = false
      const tItsID = aCaseData.caseID
      plotNumRef.current = target.current.datum()?.plotNum ?? 0
      if (target.current.node()?.nodeName === 'circle') {
        appState.beginPerformance()
        target.current
          .property('isDragging', true)
          .transition()
          .attr('r', dragPointRadiusRef.current)
        setDragID(tItsID)
        currPos.current = {x: event.clientX, y: event.clientY}

        handleClickOnCase(event, tItsID, dataset)
        // Record the current values, so we can change them during the drag and restore them when done
        const {selection} = dataConfiguration || {},
          xAttrID = dataConfiguration?.attributeID('x') ?? ''
        selection?.forEach(anID => {
          selectedDataObjects.current[anID] = {
            x: dataset?.getNumeric(anID, xAttrID) ?? 0,
            y: dataset?.getNumeric(anID, secondaryAttrIDsRef.current[plotNumRef.current]) ?? 0
          }
        })
      }
    }, [dataConfiguration, dataset, stopAnimation]),

    onDrag = useCallback((event: MouseEvent) => {
      const xAxisScale = layout.getAxisScale('bottom') as ScaleLinear<number, number>,
        xAttrID = dataConfiguration?.attributeID('x') ?? ''
      if (dragID !== '') {
        const newPos = {x: event.clientX, y: event.clientY},
          dx = newPos.x - currPos.current.x,
          dy = newPos.y - currPos.current.y
        currPos.current = newPos
        if (dx !== 0 || dy !== 0) {
          didDrag.current = true
          const deltaX = Number(xAxisScale.invert(dx)) - Number(xAxisScale.invert(0)),
            deltaY = Number(yScaleRef.current?.invert(dy)) - Number(yScaleRef.current?.invert(0)),
            caseValues: ICase[] = [],
            {selection} = dataConfiguration || {}
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
    }, [layout, dataConfiguration, dataset, dragID]),

    onDragEnd = useCallback(() => {
      dataset?.endCaching()
      appState.endPerformance()

      if (dragID !== '') {
        target.current
          .classed('dragging', false)
          .property('isDragging', false)
          .transition()
          .attr('r', selectedPointRadiusRef.current)
        setDragID(() => '')
        target.current = null

        if (didDrag.current) {
          const caseValues: ICase[] = [],
            {selection} = dataConfiguration || {},
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

  useDragHandlers(dotsRef.current, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    const {pointColor, pointStrokeColor} = graphModel.pointDescription
    dataConfiguration && setPointSelection(
      {
        dotsRef, dataConfiguration, pointRadius: pointRadiusRef.current,
        selectedPointRadius: selectedPointRadiusRef.current,
        pointColor, pointStrokeColor, getPointColorAtIndex: graphModel.pointDescription.pointColorAtIndex
      })
  }, [dataConfiguration, dotsRef, graphModel])

  const refreshSquares = useCallback(() => {

    const squareAttributes = (caseID: string, intercept: number, slope: number) => {
      const numExtraPrimaryBands = dataConfiguration?.numRepetitionsForPlace('bottom') ?? 1
      const numExtraSecondaryBands = dataConfiguration?.numRepetitionsForPlace('left') ?? 1
      const topSplitID = dataConfiguration?.attributeID("topSplit") ?? ""
      const rightSplitID = dataConfiguration?.attributeID("rightSplit") ?? ""
      const xAttrID = dataConfiguration?.attributeID("x") ?? ""
      const yAttrID = dataConfiguration?.attributeID("y") ?? ""
      const xScale = layout.getAxisScale("bottom") as ScaleLinear<number, number>
      const yScale = yScaleRef.current as ScaleLinear<number, number>
      const rightCoordValue = dataset?.getStrValue(caseID, rightSplitID) ?? ""
      const rightScale = layout.getAxisScale('rightCat') as ScaleBand<string>
      const rightScreenCoord = (rightCoordValue && rightScale(rightCoordValue)) || 0
      const xValue = dataset?.getNumeric(caseID, xAttrID) ?? NaN
  
      const getXPlotValue = () => {
        const topCoordValue = dataset?.getStrValue(caseID, topSplitID) ?? ""
        const topScale = layout.getAxisScale('top') as ScaleBand<string>
        return xScale(xValue) / numExtraPrimaryBands + (topScale(topCoordValue) || 0)
      }
  
      const getYPlotValue = () => {
        const yValue = dataset?.getNumeric(caseID, yAttrID) ?? NaN
        return yScale(yValue) / numExtraSecondaryBands + rightScreenCoord
      }
  
      const xPlotValue = getXPlotValue()
      const yPlotValue = getYPlotValue()
      const lineY = yScale(slope * xValue + intercept) / numExtraSecondaryBands + rightScreenCoord
      const lineX = xPlotValue + yPlotValue - lineY
      const x = Math.min(xPlotValue, lineX)
      const y = Math.min(yPlotValue, lineY)
      const side = Math.abs(lineY - yPlotValue)
      const color = dataConfiguration?.getLegendColorForCase(caseID)
      return { caseID, color, side, x, y }
    }
  
    if (lsrl?.isVisible) {
      const lsrlSquares: ISquareOfResidual[] = lsrl.squaresOfResiduals(dataConfiguration, squareAttributes)
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
      const mlSquares: ISquareOfResidual[] = movableLine.squaresOfResiduals(dataConfiguration, squareAttributes)
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

  }, [lsrl, movableLine, dataConfiguration, layout, dataset, instanceId])

  const refreshPointPositionsD3 = useCallback((selectedOnly: boolean) => {
    const getScreenX = (anID: string) => {
      const xAttrID = dataConfiguration?.attributeID('x') ?? ''
      const xValue = dataset?.getNumeric(anID, xAttrID) ?? NaN
      const xScale = layout.getAxisScale('bottom') as ScaleLinear<number, number>
      const topSplitID = dataConfiguration?.attributeID('topSplit') ?? ''
      const topCoordValue = dataset?.getStrValue(anID, topSplitID) ?? ''
      const topScale = layout.getAxisScale('top') as ScaleBand<string>
      return xScale(xValue) / numExtraPrimaryBands + (topScale(topCoordValue) || 0)
    }

    const getScreenY = (anID: string, plotNum = 0) => {
      const yAttrID = yAttrIDs[plotNum]
      const yScale = (hasY2Attribute && plotNum === numberOfPlots - 1 ? v2Scale : yScaleRef.current) as
          ScaleLinear<number, number>
      const rightSplitID = dataConfiguration?.attributeID('rightSplit') ?? ''
      const rightScale = layout.getAxisScale('rightCat') as ScaleBand<string>

      const yValue = dataset?.getNumeric(anID, yAttrID) ?? NaN
      const rightCoordValue = dataset?.getStrValue(anID, rightSplitID) ?? ''
      const rightScreenCoord = ((rightCoordValue && rightScale(rightCoordValue)) || 0)
      return yScale(yValue) / numExtraSecondaryBands + rightScreenCoord
    }

    const yAttrIDs = dataConfiguration?.yAttributeIDs || [],
      {pointColor, pointStrokeColor} = graphModel.pointDescription,
      hasY2Attribute = dataConfiguration?.hasY2Attribute,
      v2Scale = layout.getAxisScale("rightNumeric") as ScaleNumericBaseType,
      numExtraPrimaryBands = dataConfiguration?.numRepetitionsForPlace('bottom') ?? 1,
      numExtraSecondaryBands = dataConfiguration?.numRepetitionsForPlace('left') ?? 1,
      numberOfPlots = dataConfiguration?.numberOfPlots || 1,
      getLegendColor = legendAttrID ? dataConfiguration?.getLegendColorForCase : undefined

    setPointCoordinates({
      dataset, dotsRef, pointRadius: pointRadiusRef.current,
      selectedPointRadius: selectedPointRadiusRef.current,
      selectedOnly, getScreenX, getScreenY, getLegendColor,
      getPointColorAtIndex: graphModel.pointDescription.pointColorAtIndex,
      pointColor, pointStrokeColor, getAnimationEnabled: isAnimating
    })

  }, [dataConfiguration, graphModel.pointDescription, layout, legendAttrID, dataset, dotsRef, isAnimating])

  const refreshPointPositionsSVG = useCallback((selectedOnly: boolean) => {
    const xAttrID = dataConfiguration?.attributeID('x') ?? '',
      {joinedCaseDataArrays, selection} = dataConfiguration || {},
      primaryAxisScale = layout.getAxisScale('bottom') as ScaleLinear<number, number>
    const updateDot = (aCaseData: CaseData) => {
      const caseId = aCaseData.caseID,
        dot = dotsRef.current?.querySelector(`#${instanceId}_${caseId}`)
      if (dot) {
        const dotSvg = dot as SVGCircleElement
        const x = primaryAxisScale && getScreenCoord(dataset, caseId, xAttrID, primaryAxisScale)
        const y = yScaleRef.current &&
          getScreenCoord(dataset, caseId, secondaryAttrIDsRef.current[aCaseData.plotNum], yScaleRef.current)
        if (x != null && isFinite(x) && y != null && isFinite(y)) {
          dotSvg.setAttribute("cx", `${x}`)
          dotSvg.setAttribute("cy", `${y}`)
        }
      }
    }
    if (selectedOnly) {
      selection?.forEach(caseId => updateDot({plotNum: 0, caseID: caseId}))
    } else {
      joinedCaseDataArrays?.forEach((aCaseData) => updateDot(aCaseData))
    }
  }, [layout, dataConfiguration, dataset, dotsRef, instanceId])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    if (appState.isPerformanceMode) {
      refreshPointPositionsSVG(selectedOnly)
    } else {
      refreshPointPositionsD3(selectedOnly)
    }
    showSquares && refreshSquares()
  }, [refreshSquares, refreshPointPositionsD3, refreshPointPositionsSVG, showSquares])

  // Call refreshSquares when Squares of Residuals option is switched on and when a 
  // Movable Line adornment is being dragged.
  useEffect(function renderSquares() {
    return autorun(() => {
      showSquares && refreshSquares()
    }, { name: "ScatterDots.renderSquares" })
  }, [refreshSquares, showSquares])

  usePlotResponders({dotsRef, refreshPointPositions, refreshPointSelection})

  return (
    <>
      <svg/>
      {movableLine?.isVisible && <g ref={movableLineSquaresRef}/>}
      {lsrl?.isVisible && <g ref={lsrlSquaresRef}/>}
    </>
  )
})
