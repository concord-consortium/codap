import {max, range, select} from "d3"
import {observer} from "mobx-react-lite"
import React, {memo, useCallback, useRef, useState} from "react"
import {defaultRadius, dragRadius, transitionDuration, PlotProps}
  from "../graphing-types"
import {useDragHandlers, usePlotResponders} from "../hooks/graph-hooks"
import {appState} from "../../app-state"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {ScaleNumericBaseType, useGraphLayoutContext} from "../models/graph-layout"
import {ICase} from "../../../data-model/data-set"
import {computedPointRadius, getScreenCoord, setPointCoordinates, setPointSelection} from "../utilities/graph_utils"
import {IGraphModel} from "../models/graph-model"

interface IProps {
  graphModel:IGraphModel
  plotProps:PlotProps
}
export const DotPlotDots = memo(observer(function DotPlotDots( props: IProps) {
  const {casesRef, xAttrID, yAttrID, dotsRef, xAxisModel, yAxisModel, enableAnimation} = props.plotProps,
    graphModel = props.graphModel,
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    pointSizeMultiplier = graphModel.pointSizeMultiplier,
    xAttributeType = dataset?.attrFromID(xAttrID)?.type,
    // yAttributeType = dataset?.attrFromID(yAttrID)?.type,
    primaryPlace = xAttributeType === 'numeric' ? 'bottom' : 'left',
    primaryAttributeID = primaryPlace === 'left' ? yAttrID : xAttrID,
    secondaryPlace = primaryPlace === 'left' ? 'bottom' : 'left',
    primaryScale = layout.axisScale(primaryPlace) as ScaleNumericBaseType,
    primaryLength = layout.axisLength(primaryPlace),
    secondaryScale = layout.axisScale(secondaryPlace),
    [dragID, setDragID] = useState(''),
    currPos = useRef(0),
    didDrag = useRef(false),
    target = useRef<any>(),
    selectedDataObjects = useRef<Record<string, number>>({})

  const onDragStart = useCallback((event: MouseEvent) => {
      dataset?.beginCaching()
      didDrag.current = false
      target.current = select(event.target as SVGSVGElement)
      const tItsID: string = target.current.property('id')
      if (target.current.node()?.nodeName === 'circle') {
        enableAnimation.current = false // We don't want to animate points until end of drag
        appState.beginPerformance()
        target.current.transition()
          .attr('r', dragRadius)
        setDragID(() => tItsID)
        currPos.current = primaryPlace === 'bottom' ? event.clientX : event.clientY

        const [, caseId] = tItsID.split("_")
        dataset?.selectCases([caseId])
        // Record the current values so we can change them during the drag and restore them when done
        dataset?.selection.forEach(anID => {
          const itsValue = dataset?.getNumeric(anID, primaryAttributeID)
          if (itsValue != null) {
            selectedDataObjects.current[anID] = itsValue
          }
        })
      }
    }, [dataset, primaryPlace, primaryAttributeID, enableAnimation]),

    onDrag = useCallback((event: MouseEvent) => {
      if (dragID) {
        const newPos = primaryPlace === 'bottom' ? event.clientX : event.clientY,
          deltaPixels = newPos - currPos.current
        currPos.current = newPos
        if (deltaPixels !== 0) {
          didDrag.current = true
          const delta = Number(primaryScale?.invert(deltaPixels)) - Number(primaryScale?.invert(0)),
            caseValues: ICase[] = []
          dataset?.selection.forEach(anID => {
            const currValue = Number(dataset?.getNumeric(anID, primaryAttributeID))
            if (isFinite(currValue)) {
              caseValues.push({
                __id__: anID,
                [primaryAttributeID]: currValue + delta
              })
            }
          })
          caseValues.length && dataset?.setCaseValues(caseValues)
        }
      }
    }, [dataset, dragID, primaryAttributeID, primaryScale, primaryPlace]),

    onDragEnd = useCallback(() => {
      dataset?.endCaching()
      appState.endPerformance()

      if (dragID !== '') {
        target.current
          .classed('dragging', false)
          .transition()
          .attr('r', defaultRadius)
        setDragID('')
        target.current = null

        if (didDrag.current) {
          const caseValues: ICase[] = []
          dataset?.selection.forEach(anID => {
            caseValues.push({
              __id__: anID,
              [primaryAttributeID]: selectedDataObjects.current[anID]
            })
          })
          enableAnimation.current = true // So points will animate back to original positions
          caseValues.length && dataset?.setCaseValues(caseValues)
          didDrag.current = false
        }
      }
    }, [dataset, dragID, enableAnimation, primaryAttributeID])

  useDragHandlers(window, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    setPointSelection({dotsRef, dataset})
  }, [dataset, dotsRef])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    const
      numPoints = select(dotsRef.current).selectAll('.graph-dot').size(),
      pointDiameter = 2 * computedPointRadius(numPoints, pointSizeMultiplier),
      secondaryRangeIndex = primaryPlace === 'bottom' ? 0 : 1,
      secondaryHeight = Number(secondaryScale?.range()[secondaryRangeIndex]),
      secondarySign = primaryPlace === 'bottom' ? -1 : 1,
      baseCoord = primaryPlace === 'bottom' ? secondaryHeight : 0,
      binMap: { [id: string]: { secondaryIndex: number } } = {}
    let overlap = 0

    function computeBinPlacements() {
      const numBins = Math.ceil(primaryLength / pointDiameter) + 1,
        binWidth = primaryLength / (numBins - 1),
        bins: string[][] = range(numBins + 1).map(() => [])

      casesRef.current.forEach((anID) => {
        const numerator = primaryScale?.(dataset?.getNumeric(anID, primaryAttributeID) ?? -1),
          bin = Math.ceil((numerator ?? 0) / binWidth)
        if (bin >= 0 && bin <= numBins) {
          binMap[anID] = {secondaryIndex: bins[bin].length}
          bins[bin].push(anID)
        }
      })
      const maxInBin = (max(bins, (b => b.length)) || 0) + 1,
        excessHeight = Math.max(0, maxInBin - Math.floor(secondaryHeight / pointDiameter)) * pointDiameter
      overlap = excessHeight / maxInBin
    }

    computeBinPlacements()

    const
      getPrimaryScreenCoord = (anID: string) => getScreenCoord(dataset, anID, primaryAttributeID, primaryScale),
      computeSecondaryCoord = (binContents: { secondaryIndex: number }) => {
        return binContents ?
          baseCoord + secondarySign * (pointDiameter / 2 + binContents.secondaryIndex * (pointDiameter - overlap)) : 0
      },
      getSecondaryScreenCoord = (anID: string) => computeSecondaryCoord(binMap[anID]),
      duration = enableAnimation.current ? transitionDuration : 0,
      onComplete = enableAnimation.current ? () => {
        enableAnimation.current = false
      } : undefined,
      getScreenX = (primaryPlace === 'left') ? getSecondaryScreenCoord : getPrimaryScreenCoord,
      getScreenY = (primaryPlace === 'left') ? getPrimaryScreenCoord : getSecondaryScreenCoord

    setPointCoordinates({dotsRef, selectedOnly, pointSizeMultiplier, getScreenX, getScreenY, duration, onComplete})
  }, [dataset, casesRef, dotsRef, pointSizeMultiplier, primaryAttributeID, primaryScale, primaryPlace,
    secondaryScale, primaryLength, enableAnimation])

  usePlotResponders({
    dataset, xAxisModel, yAxisModel, xAttrID, layout,
    refreshPointPositions, refreshPointSelection, enableAnimation
  })

  return (
    <svg/>
  )
}))
