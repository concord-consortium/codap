import {ScaleBand, ScaleLinear, select} from "d3"
import React, {useCallback, useRef, useState} from "react"
import {appState} from "../../../models/app-state"
import {ScaleNumericBaseType} from "../../axis/axis-types"
import {CaseData, PlotProps} from "../graphing-types"
import {useDragHandlers, usePlotResponders} from "../hooks/use-plot"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {Bounds, useGraphLayoutContext} from "../models/graph-layout"
import {ICase} from "../../../models/data/data-set-types"
import {
  getScreenCoord,
  handleClickOnDot,
  setPointCoordinates,
  setPointSelection,
  startAnimation
} from "../utilities/graph-utils"
import {useGraphModelContext} from "../models/graph-model"

export const ScatterDots = function ScatterDots(props: PlotProps) {
  const {dotsRef, enableAnimation} = props,
    graphModel = useGraphModelContext(),
    instanceId = useInstanceIdContext(),
    dataConfiguration = useDataConfigurationContext(),
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

  const onDragStart = useCallback((event: MouseEvent) => {
      dataset?.beginCaching()
      secondaryAttrIDsRef.current = dataConfiguration?.yAttributeIDs || []
      enableAnimation.current = false // We don't want to animate points until end of drag
      didDrag.current = false
      target.current = select(event.target as SVGSVGElement)
      const tItsID = target.current.datum()?.caseID ?? ''
      plotNumRef.current = target.current.datum()?.plotNum ?? 0
      if (target.current.node()?.nodeName === 'circle') {
        appState.beginPerformance()
        target.current
          .property('isDragging', true)
          .transition()
          .attr('r', dragPointRadiusRef.current)
        setDragID(tItsID)
        currPos.current = {x: event.clientX, y: event.clientY}

        handleClickOnDot(event, tItsID, dataset)
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
    }, [dataConfiguration, dataset, enableAnimation]),

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
          startAnimation(enableAnimation) // So points will animate back to original positions
          caseValues.length && dataset?.setCaseValues(caseValues,
            [xAttrID, secondaryAttrIDsRef.current[plotNumRef.current]])
          didDrag.current = false
        }
      }
    }, [dataConfiguration, dataset, dragID, enableAnimation,])

  useDragHandlers(window, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    const {pointColor, pointStrokeColor} = graphModel
    dataConfiguration && setPointSelection(
      {
        dotsRef, dataConfiguration, pointRadius: pointRadiusRef.current,
        selectedPointRadius: selectedPointRadiusRef.current,
        pointColor, pointStrokeColor, getPointColorAtIndex: graphModel.pointColorAtIndex
      })
  }, [dataConfiguration, dotsRef, graphModel])

  const refreshPointPositionsD3 = useCallback((selectedOnly: boolean) => {
    const getScreenX = (anID: string) => {
      const xAttrID = dataConfiguration?.attributeID('x') ?? '',
        xValue = dataset?.getNumeric(anID, xAttrID) ?? NaN,
        xScale = layout.getAxisScale('bottom') as ScaleLinear<number, number>,
        topSplitID = dataConfiguration?.attributeID('topSplit') ?? '',
        topCoordValue = dataset?.getValue(anID, topSplitID) ?? '',
        topScale = layout.getAxisScale('top') as ScaleBand<string>
      return xScale(xValue) / numExtraPrimaryBands + (topScale(topCoordValue) || 0)
    }

    const getScreenY = (anID: string, plotNum = 0) => {
      const yAttrID = yAttrIDs[plotNum],
        yValue = dataset?.getNumeric(anID, yAttrID) ?? NaN,
        yScale = (hasY2Attribute && plotNum === numberOfPlots - 1 ? v2Scale : yScaleRef.current) as
          ScaleLinear<number, number>,
        rightSplitID = dataConfiguration?.attributeID('rightSplit') ?? '',
        rightCoordValue = dataset?.getValue(anID, rightSplitID) ?? '',
        rightScale = layout.getAxisScale('rightCat') as ScaleBand<string>,
        rightScreenCoord = ((rightCoordValue && rightScale(rightCoordValue)) || 0)
      return yScale(yValue) / numExtraSecondaryBands + rightScreenCoord
    }

    const yAttrIDs = dataConfiguration?.yAttributeIDs || [],
      {pointColor, pointStrokeColor} = graphModel,
      hasY2Attribute = dataConfiguration?.hasY2Attribute,
      v2Scale = layout.getAxisScale("rightNumeric") as ScaleNumericBaseType,
      numExtraPrimaryBands = dataConfiguration?.numRepetitionsForPlace('bottom') ?? 1,
      numExtraSecondaryBands = dataConfiguration?.numRepetitionsForPlace('left') ?? 1,
      numberOfPlots = dataConfiguration?.numberOfPlots || 1,
      getLegendColor = legendAttrID ? dataConfiguration?.getLegendColorForCase : undefined,
      {computedBounds} = layout,
      plotBounds = computedBounds.get('plot') as Bounds

    setPointCoordinates({
      dataset, dotsRef, pointRadius: pointRadiusRef.current, selectedPointRadius: selectedPointRadiusRef.current,
      plotBounds, selectedOnly, getScreenX, getScreenY, getLegendColor,
      getPointColorAtIndex: graphModel.pointColorAtIndex, enableAnimation, pointColor, pointStrokeColor
    })
  }, [dataConfiguration, dataset, dotsRef, layout, legendAttrID, enableAnimation, graphModel,
    yScaleRef])

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
  }, [refreshPointPositionsD3, refreshPointPositionsSVG])

  usePlotResponders({
    graphModel, primaryAttrID: dataConfiguration?.attributeID('x') ?? '',
    secondaryAttrID: secondaryAttrIDsRef.current[0],
    layout, dotsRef, refreshPointPositions, refreshPointSelection, enableAnimation
  })

  return (
    <svg/>
  )
}
