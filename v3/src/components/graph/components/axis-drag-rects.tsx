import {observer} from "mobx-react-lite"
import React, {useEffect, useRef} from "react"
import {drag, select} from "d3"
import {INumericAxisModel} from "../models/axis-model"
import {useGraphLayoutContext} from "../models/graph-layout"
import t from "../../../utilities/translation/translate"
import "./axis.scss"

interface IProps {
  axisModel: INumericAxisModel
  axisWrapperElt: SVGGElement | null
  inGraph: boolean | undefined
  scale: any
  boundsRect: any
}

type D3Handler = (this: Element, event: any, d: any) => void

const axisDragHints = [ t("DG.CellLinearAxisView.lowerPanelTooltip"),
                        t("DG.CellLinearAxisView.midPanelTooltip"),
                        t("DG.CellLinearAxisView.upperPanelTooltip") ]

export const AxisDragRects = observer(({axisModel, axisWrapperElt, inGraph, scale, boundsRect}: IProps) => {
  const marker = inGraph ? "in-graph: " : "in-slider: "


  const rectRef = useRef() as React.RefObject<SVGSVGElement>,
    place = axisModel.place,
    layout = useGraphLayoutContext()


  useEffect(function createRects() {
    let scaleAtStart: any = null,
      lowerAtStart: number,
      upperAtStart: number,
      dilationAnchorCoord: number,
      dragging = false

    const onDragStart: D3Handler = () => {
        select(this as Element)
          .classed('dragging', true)
        axisModel.setTransitionDuration(0)
      },

      onDilateStart: D3Handler = (event: { x: number, y: number }) => {
        select(this)
          .classed('dragging', true)
        scaleAtStart = scale?.copy()
        lowerAtStart = scaleAtStart.domain()[0]
        upperAtStart = scaleAtStart.domain()[1]
        dilationAnchorCoord = Number(place === 'bottom' ? scale?.invert(event.x) : scale?.invert(event.y))
        dragging = true
        axisModel.setTransitionDuration(0)
      },

      onLowerDilateDrag = (event: { x: number, y: number, dx: number, dy: number }) => {
        const delta = -(place === 'bottom' ? event.dx : event.dy)
        if (dragging && delta !== 0) {
          const
            x2 = place === 'bottom' ? scaleAtStart.invert(event.x) : scaleAtStart.invert(event.y),
            ratio = (upperAtStart - x2) / (upperAtStart - dilationAnchorCoord),
            newRange = (upperAtStart - lowerAtStart) / ratio,
            newLowerBound = upperAtStart - newRange
          axisModel.setDomain(newLowerBound, upperAtStart)
        }
      },

      onDragTranslate = (event: { dx: number; dy: number }) => {
        const delta = -(place === 'bottom' ? event.dx : event.dy)
        if (delta !== 0) {
          const worldDelta = Number(scale?.invert(delta)) - Number(scale?.invert(0))
          axisModel.setDomain(axisModel.min + worldDelta, axisModel.max + worldDelta)
        }
      },

      onUpperDilateDrag = (event: { x: number, y: number, dx: number, dy: number }) => {
        const delta = (place === 'bottom' ? event.dx : event.dy)
        if (dragging && delta !== 0) {
          const
            x2 = place === 'bottom' ? scaleAtStart.invert(event.x) : scaleAtStart.invert(event.y),
            ratio = (x2 - lowerAtStart) / (dilationAnchorCoord - lowerAtStart),
            newRange = (upperAtStart - lowerAtStart) / ratio,
            newUpperBound = lowerAtStart + newRange
          axisModel.setDomain(lowerAtStart, newUpperBound)
        }
      },

      onDragEnd = () => {
        select(this)
          .classed('dragging', false)
        scaleAtStart = null
        dragging = false
      }

    if (rectRef.current) {
      const rectSelection = select(rectRef.current)

      // Add three rects in which the user can drag to dilate or translate the scale
      const
        classPrefix = place === 'bottom' ? 'h' : 'v',
        numbering = place === 'bottom' ? [0, 1, 2] : [2, 1, 0],
        classPostfixes = place === 'bottom' ? ['lower-dilate', 'translate', 'upper-dilate'] :
          ['upper-dilate', 'translate', 'lower-dilate'],
        dragBehavior = [drag()  // lower
          .on("start", onDilateStart)
          .on("drag", onLowerDilateDrag)
          .on("end", onDragEnd),
          drag()  // middle
            .on("start", onDragStart)
            .on("drag", onDragTranslate)
            .on("end", onDragEnd),
          drag()  // upper
            .on("start", onDilateStart)
            .on("drag", onUpperDilateDrag)
            .on("end", onDragEnd)]
      rectSelection
        .selectAll('.dragRect')
        .data(numbering)// data signify lower, middle, upper rectangles
        .join(
          // @ts-expect-error void => Selection
          (enter) => {
            enter.append('rect')
              .attr('class', (d) => `dragRect ${classPrefix}-${classPostfixes[d]}`)
              .append('title')
              .text((d: number) => axisDragHints[numbering[d]])
          }
        )
      numbering.forEach((behaviorIndex, axisIndex) => {
        rectSelection.select(`.dragRect.${classPrefix}-${classPostfixes[axisIndex]}`)
          .call(dragBehavior[behaviorIndex])
      })
    }
  }, [axisModel, place, scale])

  // update layout of axis drag rects
  useEffect(() => {
    // TODO passed boundsRect only working with slider atm
    // So need to circle back and figure out why the sometimes
    // undefined boundsRect is breaking positioning for graph
    // once that is done we can remove layout

    //console.log({boundsRect})
    const boundsToUse = inGraph ? layout.getAxisBounds(place) : boundsRect
    console.log(marker, {boundsRect}, "rectRef.current", rectRef.current, "layout.getAxisBounds(place)", layout.getAxisBounds(place))
    const length = place === "bottom" ? boundsToUse?.width : boundsToUse?.height
    const rectSelection = select(rectRef.current)
    const numbering = place === 'bottom' ? [0, 1, 2] : [2, 1, 0]
    if (length != null && boundsToUse != null) {
      rectSelection
        .selectAll('.dragRect')
        .data(numbering)// data signify lower, middle, upper rectangles
        .join(
          // @ts-expect-error void => Selection
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          (enter) => {
          },
          (update) => {
            if (inGraph){
              update
                .attr('x', (d) => boundsToUse?.left + (place === 'bottom' ? (d * length / 3) : 0))
                .attr('y', (d) => boundsToUse?.top + (place === 'bottom' ? 0 : (d * length / 3)))
                .attr('width', () => (place === 'bottom' ? length / 3 : boundsToUse?.width))
                .attr('height', () => (place === 'bottom' ? boundsToUse?.height : length / 3))
            }

            else {
              // roughly [{x:0, y: 0}, {x: sliderWidth * .33, y:0 }, {x: sliderWidth * .66, y: 0}]
              // need to use the d to spread them out
              update
                .attr('x',0)
                .attr('y',0)
                .attr('width', boundsToUse?.width)
                .attr('height', 30)
            }

          }
        )
      rectSelection.selectAll('.dragRect').raise()
    }
  },[boundsRect, place])
  return (
    <g className={'dragRect'} ref={rectRef}/>
  )
})
