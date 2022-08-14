import React, {useCallback, useEffect, useRef} from "react"
import {drag, select} from "d3"
import RTree from 'rtree'
import {Rect, plotProps, InternalizedData, rTreeRect} from "../graphing-types"
import { useGraphLayoutContext } from "../models/graph-layout"
import {rectangleSubtract, rectNormalize} from "../utilities/graph_utils"
import { appState } from "../../app-state"
import { useCurrent } from "../../../hooks/use-current"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { prf } from "../../../utilities/profiler"

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

export const Background = (props: {
  dots: plotProps,
  marquee: {
    rect: Rect,
    setRect: React.Dispatch<React.SetStateAction<Rect>>
  }
}) => {
  const { dots, marquee: { setRect: setMarqueeRect }} = props,
    dataset = useCurrent(useDataSetContext()),
    layout = useGraphLayoutContext(),
    { plotWidth, plotHeight } = layout,
    xScale = layout.axisScale("bottom"),
    yScale = layout.axisScale("left"),
    ref = useRef() as React.RefObject<SVGSVGElement>,
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
      const leftEdge = ref.current?.getBBox().x ?? 0
      selectionTree.current = prepareTree('.graph-dot-area', 'circle')
      startX.current = event.x - leftEdge
      startY.current = event.y
      width.current = 0
      height.current = 0
      setMarqueeRect({x: event.x - leftEdge, y: event.y, width: 0, height: 0})
      currentlySelectedCaseIDs.current = []
    }, [setMarqueeRect]),

    onDrag = useCallback((event: { dx: number; dy: number }) => {
      prf.measure("Graph.dragMarquee", () => {
        if (event.dx !== 0 || event.dy !== 0) {
          previousMarqueeRect.current = rectNormalize(
            {x: startX.current, y: startY.current, w: width.current, h: height.current})
          width.current = width.current + event.dx
          height.current = height.current + event.dy
          prf.measure("Graph.dragMarquee[setRect]", () => {
            setMarqueeRect(prevRect => {
              return {
                x: prevRect.x, y: prevRect.y,
                width: prevRect.width + event.dx,
                height: prevRect.height + event.dy
              }
            })
          })
          prf.begin("Graph.dragMarquee[diff]")
          const currentRect = rectNormalize({
              x: startX.current, y: startY.current,
              w: width.current,
              h: height.current
            }),
            newSelection = getCasesForDelta(selectionTree.current, currentRect, previousMarqueeRect.current),
            newDeselection = getCasesForDelta(selectionTree.current, previousMarqueeRect.current, currentRect)
          prf.end("Graph.dragMarquee[diff]")
          prf.begin("Graph.dragMarquee[selectCases]")
          newSelection.length && dataset.current?.selectCases(newSelection, true)
          newDeselection.length && dataset.current?.selectCases(newDeselection, false)
          prf.end("Graph.dragMarquee[selectCases]")
        }
      })
    }, [dataset, setMarqueeRect]),

    onDragEnd = useCallback(() => {
      setMarqueeRect({x: 0, y: 0, width: 0, height: 0})
      selectionTree.current = null
      appState.endPerformance()
    }, [setMarqueeRect])

  useEffect(() => {
    const dragBehavior = drag()
        .on("start", onDragStart)
        .on("drag", onDrag)
        .on("end", onDragEnd),
      groupElement = ref.current
    select(groupElement).on('click', () => {
      prf.begin("Graph.background[useEffect-selectAll]")
      dataset.current?.selectAll(false)
      prf.end("Graph.background[useEffect-selectAll]")
    })

    select(groupElement)
      .selectAll('rect')
      .data([1])
      .join(
        // @ts-expect-error void => Selection
        (enter) => {
          enter.append('rect')
            .attr('class', 'graph-background')
            .attr('transform', dots.transform)
            .call(dragBehavior)
        },
        (update) => {
          update.attr('width', plotWidth)
            .attr('height', plotHeight)
            .attr('x', plotX)
            .attr('y', plotY)
        }
      )
  }, [dataset, onDrag, onDragEnd, onDragStart, plotHeight, plotWidth, plotX, plotY, dots.transform])

  return (
    <g ref={ref}/>
  )
}
