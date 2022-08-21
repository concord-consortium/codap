import {max, range, select} from "d3"
import {reaction} from "mobx"
import {onAction} from "mobx-state-tree"
import {observer} from "mobx-react-lite"
import React, {memo, useCallback, useEffect, useRef, useState} from "react"
import {plotProps, InternalizedData, defaultRadius, dragRadius, transitionDuration, defaultDiameter}
  from "../graphing-types"
import {useDragHandlers} from "../hooks/graph-hooks"
import {appState} from "../../app-state"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {INumericAxisModel} from "../models/axis-model"
import {useGraphLayoutContext} from "../models/graph-layout"
import {ICase} from "../../../data-model/data-set"
import {prf} from "../../../utilities/profiler"
import {getScreenCoord, setPointCoordinates, setPointSelection} from "../utilities/graph_utils"
import {isSelectionAction, isSetCaseValuesAction} from "../../../data-model/data-set-actions"

export const DotPlotDots = memo(observer(function DotPlotDots(props: {
  dots: plotProps,
  axisModel: INumericAxisModel,
  graphData: InternalizedData,
  dotsRef: React.RefObject<SVGSVGElement>
}) {
  const {graphData, dotsRef, axisModel} = props,
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
    firstTime = useRef(true),
    xAttrID = graphData.xAttributeID,
    selectedDataObjects = useRef<Record<string, { x: number }>>({})

  const onDragStart = useCallback((event: MouseEvent) => {
      appState.beginPerformance()
      dataset?.beginCaching()
      firstTime.current = false // We don't want to animate points until end of drag
      didDrag.current = false
      target.current = select(event.target as SVGSVGElement)
      const tItsID: string = target.current.property('id')
      if (target.current.node()?.nodeName === 'circle') {
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
    }, [dataset, xAttrID]),

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
          firstTime.current = true // So points will animate back to original positions
          caseValues.length && dataset?.setCaseValues(caseValues)
          didDrag.current = false
        }
      }
    }, [dataset, dragID, xAttrID])

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

        dataset?.cases.forEach(({__id__}) => {
          const numerator = xScale?.(dataset?.getNumeric(__id__, xAttrID) ?? -1),
            bin = Math.ceil((numerator ?? 0) / binWidth)
          if (bin >= 0 && bin <= numBins) {
            bins[bin].push(__id__)
            binMap[__id__] = {yIndex: bins[bin].length}
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
        duration = firstTime.current ? transitionDuration : 0,
        onComplete = firstTime.current ? () => {
          firstTime.current = false
        } : undefined

      setPointCoordinates({dotsRef, selectedOnly, getScreenX, getScreenY, duration, onComplete})
    })
  }, [dataset, dotsRef, xAttrID, xScale, yScale, plotWidth])

  // respond to axis domain changes (e.g. axis dragging)
  useEffect(() => {
    refreshPointPositions(false)
    const disposer = reaction(
      () => [axisModel.domain],
      domains => {
        firstTime.current = false // don't animate response to axis changes
        refreshPointPositions(false)
      }
    )
    return () => disposer()
  }, [refreshPointPositions, axisModel.domain])

  // respond to axis range changes (e.g. component resizing)
  useEffect(() => {
    refreshPointPositions(false)
    const disposer = reaction(
      () => [layout.axisLength(place), layout.axisLength(countPlace)],
      ranges => {
        firstTime.current = false // don't animate response to axis changes
        refreshPointPositions(false)
      }
    )
    return () => disposer()
  }, [layout, refreshPointPositions, place, countPlace])

  // respond to selection and value changes
  useEffect(() => {
    const disposer = dataset && onAction(dataset, action => {
      if (isSelectionAction(action)) {
        refreshPointSelection()
      } else if (isSetCaseValuesAction(action)) {
        // assumes that if we're caching then only selected cases are being updated
        refreshPointPositions(dataset.isCaching)
      }
    }, true)
    return () => disposer?.()
  }, [dataset, refreshPointPositions, refreshPointSelection])

  return (
    <svg/>
  )
}))
/*
if (DotPlotDots) {
  (DotPlotDots as any).whyDidYouRender = {logOnDifferentValues: true, customName: 'DotPlotDots'}
}
*/
