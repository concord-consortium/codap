import React, {useCallback, useEffect, useRef} from "react"
import {drag, select} from "d3"
import RTree from 'rtree'
import {Rect, plotProps, InternalizedData, rTreeRect} from "../graphing-types"
import {rectangleSubtract, rectNormalize} from "../utilities/graph_utils"
import { appState } from "../../app-state"
import {IDataSet} from "../../../data-model/data-set"
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
  worldDataRef: React.MutableRefObject<IDataSet | undefined>,
  marquee: {
    rect: Rect,
    setRect: React.Dispatch<React.SetStateAction<Rect>>
  }
}) => {
  const {worldDataRef, dots: {xScale, yScale}} = props,
    ref = useRef() as React.RefObject<SVGSVGElement>,
    plotX = Number(xScale?.range()[0]),
    plotY = Number(yScale?.range()[1]),
    plotWidth = Number(xScale?.range()[1]) - plotX,
    plotHeight = Number(yScale?.range()[0]) - plotY,
    startX = useRef(0),
    startY = useRef(0),
    width = useRef(0),
    height = useRef(0),
    selectionTree = useRef<typeof RTree | null>(null),
    previousMarqueeRect = useRef<rTreeRect>(),
    currentlySelectedCaseIDs = useRef<string[]>([]),

    onDragStart = useCallback((event: MouseEvent) => {
      appState.beginPerformance()
      const leftEdge = ref.current?.getBBox().x
      selectionTree.current = prepareTree('.graph-dot-area', 'circle')
      startX.current = event.x - (leftEdge || 0)
      startY.current = event.y
      width.current = 0
      height.current = 0
      props.marquee.setRect({x: event.x - 60, y: event.y, width: 0, height: 0})
      currentlySelectedCaseIDs.current = []
    }, [props.marquee]),

    onDrag = useCallback((event: { dx: number; dy: number }) => {
      prf.measure("Graph.dragMarquee", () => {
        if (event.dx !== 0 || event.dy !== 0) {
          previousMarqueeRect.current = rectNormalize(
            {x: startX.current, y: startY.current, w: width.current, h: height.current})
          width.current = width.current + event.dx
          height.current = height.current + event.dy
          prf.measure("Graph.dragMarquee[setRect]", () => {
            props.marquee.setRect(prevRect => {
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
          newSelection.length && worldDataRef.current?.selectCases(newSelection, true)
          newDeselection.length && worldDataRef.current?.selectCases(newDeselection, false)
          prf.end("Graph.dragMarquee[selectCases]")
        }
      })
    }, [height, props, worldDataRef, width]),

    onDragEnd = useCallback(() => {
      props.marquee.setRect({x: 0, y: 0, width: 0, height: 0})
      selectionTree.current = null
      appState.endPerformance()
    }, [props.marquee])

  useEffect(() => {
    const dragBehavior = drag()
        .on("start", onDragStart)
        .on("drag", onDrag)
        .on("end", onDragEnd),
      groupElement = ref.current
    select(groupElement).on('click', () => {
      prf.begin("Graph.background[useEffect-selectAll]")
      worldDataRef.current?.selectAll(false)
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
            .attr('transform', props.dots.transform)
            .call(dragBehavior)
        },
        (update) => {
          update.attr('width', plotWidth)
            .attr('height', plotHeight)
            .attr('x', plotX)
            .attr('y', plotY)
        }
      )
  }, [worldDataRef, props, props.dots.transform, props.dots, props.marquee,
    xScale, yScale, plotX, plotY, plotWidth, plotHeight, height, width, startX, startY, onDrag, onDragStart, onDragEnd])

  return (
    <g ref={ref}/>
  )
}
