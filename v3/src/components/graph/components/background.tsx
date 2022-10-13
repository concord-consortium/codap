import React, {forwardRef, MutableRefObject, useCallback, useEffect, useRef} from "react"
import {drag, select} from "d3"
import RTree from 'rtree'
import {InternalizedData, rTreeRect} from "../graphing-types"
import {useGraphLayoutContext} from "../models/graph-layout"
import {rectangleSubtract, rectNormalize} from "../utilities/graph-utils"
import {appState} from "../../app-state"
import {useCurrent} from "../../../hooks/use-current"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {MarqueeState} from "../models/marquee-state"

interface IProps {
  transform: string
  marqueeState: MarqueeState
}

const prepareTree = (areaSelector: string, circleSelector: string): typeof RTree => {
  const selectionTree = RTree(10)
  select(areaSelector).selectAll(circleSelector)
    .each((datum: InternalizedData, index, groups) => {
      const element: any = groups[index],
        rect = {
          x: Number(element.cx.baseVal.value),
          y: Number(element.cy.baseVal.value),
          w: 1, h: 1
        }
      selectionTree.insert(rect, element.__data__)
    })
  // @ts-expect-error fromJSON
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
  const {transform, marqueeState} = props,
    dataset = useCurrent(useDataSetContext()),
    layout = useGraphLayoutContext(),
    {plotWidth, plotHeight} = layout,
    xScale = layout.axisScale("bottom"),
    yScale = layout.axisScale("left"),
    bgRef = ref as MutableRefObject<SVGGElement | null>,
    plotX = Number(xScale?.range()[0]),
    plotY = Number(yScale?.range()[1]),
    startX = useRef(0),
    startY = useRef(0),
    width = useRef(0),
    height = useRef(0),
    selectionTree = useRef<typeof RTree | null>(null),
    previousMarqueeRect = useRef<rTreeRect>(),
    currentlySelectedCaseIDs = useRef<string[]>([]),

    onDragStart = useCallback((event: MouseEvent) => {
      appState.beginPerformance()
      const leftEdge = bgRef.current?.getBBox().x ?? 0
      selectionTree.current = prepareTree('.graph-dot-area', 'circle')
      startX.current = event.x - leftEdge
      startY.current = event.y
      width.current = 0
      height.current = 0
      marqueeState.setMarqueeRect({x: event.x - leftEdge, y: event.y, width: 0, height: 0})
      currentlySelectedCaseIDs.current = []
    }, [marqueeState, bgRef]),

    onDrag = useCallback((event: { dx: number; dy: number }) => {
      if (event.dx !== 0 || event.dy !== 0) {
        previousMarqueeRect.current = rectNormalize(
          {x: startX.current, y: startY.current, w: width.current, h: height.current})
        width.current = width.current + event.dx
        height.current = height.current + event.dy
        const marqueeRect = marqueeState.marqueeRect
        marqueeState.setMarqueeRect( {
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
    }, [marqueeState])

  useEffect(() => {
    const dragBehavior = drag()
        .on("start", onDragStart)
        .on("drag", onDrag)
        .on("end", onDragEnd),
      groupElement = bgRef.current
    select(groupElement).on('click', () => {
      dataset.current?.selectAll(false)
    })

    select(groupElement)
      .selectAll('rect')
      .data([1])
      .join(
        // @ts-expect-error void => Selection
        (enter) => {
          enter.append('rect')
            .attr('class', 'graph-background')
            .attr('transform', transform)
            .call(dragBehavior)
        },
        (update) => {
          update.attr('width', plotWidth)
            .attr('height', plotHeight)
            .attr('x', plotX)
            .attr('y', plotY)
        }
      )
  }, [bgRef, dataset, onDrag, onDragEnd, onDragStart, plotHeight, plotWidth, plotX, plotY, transform])

  return (
    <g ref={bgRef}/>
  )
})
Background.displayName = "Background"
