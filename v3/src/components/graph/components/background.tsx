import {onAction} from "mobx-state-tree"
import React, {forwardRef, MutableRefObject, useCallback, useEffect, useRef} from "react"
import {drag, select, color, range} from "d3"
import RTreeLib from 'rtree'

type RTree = ReturnType<typeof RTreeLib>
import {CaseData} from "../d3-types"
import {InternalizedData, rTreeRect} from "../graphing-types"
import {useGraphLayoutContext} from "../models/graph-layout"
import {rectangleSubtract, rectNormalize} from "../utilities/graph-utils"
import {appState} from "../../../models/app-state"
import {useCurrent} from "../../../hooks/use-current"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {MarqueeState} from "../models/marquee-state"
import {useGraphModelContext} from "../models/graph-model"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"

interface IProps {
  marqueeState: MarqueeState
}

const prepareTree = (areaSelector: string, circleSelector: string): RTree => {
    const selectionTree = RTreeLib(10)
    select<HTMLDivElement, unknown>(areaSelector).selectAll<SVGCircleElement, InternalizedData>(circleSelector)
      .each((datum: InternalizedData, index, groups) => {
        const element: any = groups[index],
          rect = {
            x: Number(element.cx.baseVal.value),
            y: Number(element.cy.baseVal.value),
            w: 1, h: 1
          }
        selectionTree.insert(rect, (element.__data__ as CaseData).caseID)
      })
    return selectionTree
  },

  getCasesForDelta = (tree: any, newRect: rTreeRect, prevRect: rTreeRect) => {
    const diffRects = rectangleSubtract(newRect, prevRect)
    let caseIDs: string[] = []
    diffRects.forEach(aRect => {
      const newlyFoundIDs = tree.search(aRect)
      caseIDs = caseIDs.concat(newlyFoundIDs)
    })
    return caseIDs
  }

export const Background = forwardRef<SVGGElement, IProps>((props, ref) => {
  const {marqueeState} = props,
    instanceId = useInstanceIdContext() || 'background',
    dataset = useCurrent(useDataSetContext()),
    layout = useGraphLayoutContext(),
    graphModel = useGraphModelContext(),
    bounds = layout.computedBounds.plot,
    plotWidth = bounds.width,
    plotHeight = bounds.height,
    transform = `translate(${bounds.left}, ${bounds.top})`,
    bgRef = ref as MutableRefObject<SVGGElement | null>,
    startX = useRef(0),
    startY = useRef(0),
    width = useRef(0),
    height = useRef(0),
    selectionTree = useRef<RTree | null>(null),
    previousMarqueeRect = useRef<rTreeRect>()

  const onDragStart = useCallback((event: { x: number; y: number; sourceEvent: { shiftKey: boolean } }) => {
      const {computedBounds} = layout,
        plotBounds = computedBounds.plot
      appState.beginPerformance()
      selectionTree.current = prepareTree(`.${instanceId}`, 'circle')
      startX.current = event.x - plotBounds.left
      startY.current = event.y - plotBounds.top
      width.current = 0
      height.current = 0
      if (!event.sourceEvent.shiftKey) {
        dataset.current?.setSelectedCases([])
      }
      marqueeState.setMarqueeRect({x: startX.current, y: startY.current, width: 0, height: 0})
    }, [dataset, instanceId, layout, marqueeState]),

    onDrag = useCallback((event: { dx: number; dy: number }) => {
      if (event.dx !== 0 || event.dy !== 0) {
        previousMarqueeRect.current = rectNormalize(
          {x: startX.current, y: startY.current, w: width.current, h: height.current})
        width.current = width.current + event.dx
        height.current = height.current + event.dy
        const marqueeRect = marqueeState.marqueeRect
        marqueeState.setMarqueeRect({
          x: marqueeRect.x, y: marqueeRect.y,
          width: marqueeRect.width + event.dx,
          height: marqueeRect.height + event.dy
        })
        const currentRect = rectNormalize({
            x: startX.current, y: startY.current,
            w: width.current,
            h: height.current
          }),
          newSelection = getCasesForDelta(selectionTree.current, currentRect, previousMarqueeRect.current),
          newDeselection = getCasesForDelta(selectionTree.current, previousMarqueeRect.current, currentRect)
        newSelection.length && dataset.current?.selectCases(newSelection, true)
        newDeselection.length && dataset.current?.selectCases(newDeselection, false)
      }
    }, [dataset, marqueeState]),

    onDragEnd = useCallback(() => {
      marqueeState.setMarqueeRect({x: 0, y: 0, width: 0, height: 0})
      selectionTree.current = null
      appState.endPerformance()
    }, [marqueeState]),
    dragBehavior = drag<SVGRectElement, number>()
      .on("start", onDragStart)
      .on("drag", onDrag)
      .on("end", onDragEnd)

  const refreshBackground = useCallback(() => {
    const bgColor = String(color(graphModel.plotBackgroundColor)),
      darkBgColor = String(color(graphModel.plotBackgroundColor)?.darker(0.2)),
      numRows = layout.getAxisMultiScale('left').repetitions,
      numCols = layout.getAxisMultiScale('bottom').repetitions,
      cellWidth = plotWidth / numCols,
      cellHeight = plotHeight / numRows,
      row = (index: number) => Math.floor(index / numCols),
      col = (index: number) => index % numCols,
      groupElement = bgRef.current
    select(groupElement)
      .selectAll('rect')
      .data(range(numRows * numCols))
      .join('rect')
      .attr('class', 'plot-cell-background')
      .attr('transform', transform)
      .attr('width', cellWidth)
      .attr('height', cellHeight)
      .attr('x', d => cellWidth * col(d))
      .attr('y', d => cellHeight * row(d))
      .style('fill', d => (row(d) + col(d)) % 2 === 0 ? bgColor : darkBgColor)
      .style('fill-opacity', graphModel.isTransparent ? 0 : 1)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      .call(dragBehavior)
  }, [bgRef, dragBehavior, graphModel.isTransparent, graphModel.plotBackgroundColor, layout,
    plotHeight, plotWidth, transform])

  useEffect(() => {
    const groupElement = bgRef.current
    select(groupElement).on('click', (event) => {
      if (!event.shiftKey) {
        dataset.current?.selectAll(false)
      }
    })
    refreshBackground()
  }, [dataset, bgRef, refreshBackground])

  // respond to point properties change
  useEffect(function respondToGraphPointVisualAction() {
    const disposer = onAction(graphModel, action => {
      if (['setPlotBackgroundColor', 'setIsTransparent'].includes(action.name)) {
        refreshBackground()
      }
    }, true)

    return () => disposer()
  }, [graphModel, bgRef, refreshBackground])

  return (
    <g ref={bgRef}/>
  )
})
Background.displayName = "Background"
