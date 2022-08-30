import {max, range, select} from "d3"
import {observer} from "mobx-react-lite"
import React, {memo, useCallback, useRef, useState} from "react"
import {defaultRadius, dragRadius, transitionDuration, defaultDiameter}
  from "../graphing-types"
import {useDragHandlers, usePlotResponders} from "../hooks/graph-hooks"
import {appState} from "../../app-state"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {INumericAxisModel} from "../models/axis-model"
import {useGraphLayoutContext} from "../models/graph-layout"
import {ICase} from "../../../data-model/data-set"
import {prf} from "../../../utilities/profiler"
import {getScreenCoord, setPointCoordinates, setPointSelection} from "../utilities/graph_utils"

export const DotPlotDots = memo(observer(function DotPlotDots(props: {
  casesRef: React.MutableRefObject<string[]>
  xAttrID: string
  axisModel: INumericAxisModel,
  dotsRef: React.RefObject<SVGSVGElement>
  enableAnimation: React.MutableRefObject<boolean>
}) {
  const {casesRef, xAttrID, dotsRef, axisModel, enableAnimation} = props,
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    place = axisModel.place,
    countPlace = place === 'left' ? 'bottom' : 'left',
    xScale = layout.axisScale(place),
    {plotWidth} = layout,
    yScale = layout.axisScale(countPlace),
    [dragID, setDragID] = useState(''),
    currPos = useRef({x: 0}),
    didDrag = useRef(false),
    target = useRef<any>(),
    selectedDataObjects = useRef<Record<string, { x: number }>>({})

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
        currPos.current = {x: event.clientX}

        const [, caseId] = tItsID.split("_")
        dataset?.selectCases([caseId])
        // Record the current values so we can change them during the drag and restore them when done
        dataset?.selection.forEach(anID => {
          const itsValue = dataset?.getNumeric(anID, xAttrID)
          if (itsValue != null) {
            selectedDataObjects.current[anID] = {
              x: itsValue
            }
          }
        })
      }
    }, [dataset, xAttrID, enableAnimation]),

    onDrag = useCallback((event: MouseEvent) => {
      if (dragID) {
        const newPos = {x: event.clientX},
          dx = newPos.x - currPos.current.x
        currPos.current = newPos
        if (dx !== 0) {
          didDrag.current = true
          const deltaX = Number(xScale?.invert(dx)) - Number(xScale?.invert(0)),
            caseValues: ICase[] = []
          dataset?.selection.forEach(anID => {
            const currX = Number(dataset?.getNumeric(anID, xAttrID))
            if (isFinite(currX)) {
              caseValues.push({
                __id__: anID,
                [xAttrID]: currX + deltaX
              })
            }
          })
          caseValues.length && dataset?.setCaseValues(caseValues)
        }
      }
    }, [dataset, dragID, xAttrID, xScale]),

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
              [xAttrID]: selectedDataObjects.current[anID].x
            })
          })
          enableAnimation.current = true // So points will animate back to original positions
          caseValues.length && dataset?.setCaseValues(caseValues)
          didDrag.current = false
        }
      }
    }, [dataset, dragID, xAttrID, enableAnimation])

  useDragHandlers(window, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    prf.measure("Graph.DotPlotDots[refreshPointSelection]", () => {
      setPointSelection({dotsRef, dataset})
    })
  }, [dataset, dotsRef])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    prf.measure("Graph.DotPlotDots[refreshPointPositions]", () => {
      const
        yHeight = Number(yScale?.range()[0]),
        binMap: { [id: string]: { yIndex: number } } = {}
      let overlap = 0

      function computeBinPlacements() {
        const numBins = Math.ceil(plotWidth / defaultDiameter) + 1,
          binWidth = plotWidth / (numBins - 1),
          bins: string[][] = range(numBins + 1).map(() => [])

        casesRef.current.forEach((anID) => {
          const numerator = xScale?.(dataset?.getNumeric(anID, xAttrID) ?? -1),
            bin = Math.ceil((numerator ?? 0) / binWidth)
          if (bin >= 0 && bin <= numBins) {
            bins[bin].push(anID)
            binMap[anID] = {yIndex: bins[bin].length}
          }
        })
        const maxInBin = (max(bins, (b => b.length)) || 0) + 1,
          excessHeight = Math.max(0, maxInBin - Math.floor(yHeight / defaultDiameter)) * defaultDiameter
        overlap = excessHeight / maxInBin
      }

      computeBinPlacements()

      const
        getScreenX = (anID: string) => getScreenCoord(dataset, anID, xAttrID, xScale),
        computeYCoord = (binContents: { yIndex: number }) => {
          return binContents ? yHeight - defaultRadius / 2 - binContents.yIndex * (defaultDiameter - overlap) : 0
        },
        getScreenY = (anID: string) => computeYCoord(binMap[anID]),
        duration = enableAnimation.current ? transitionDuration : 0,
        onComplete = enableAnimation.current ? () => {
          enableAnimation.current = false
        } : undefined

      setPointCoordinates({dotsRef, selectedOnly, getScreenX, getScreenY, duration, onComplete})
    })
  }, [dataset, casesRef, dotsRef, xAttrID, xScale, yScale, plotWidth, enableAnimation])

  usePlotResponders({
    dataset, xAxisModel: axisModel, xAttrID, layout,
    refreshPointPositions, refreshPointSelection, enableAnimation
  })

  return (
    <svg/>
  )
}))
/*
if (DotPlotDots) {
  (DotPlotDots as any).whyDidYouRender = {logOnDifferentValues: true, customName: 'DotPlotDots'}
}
*/
