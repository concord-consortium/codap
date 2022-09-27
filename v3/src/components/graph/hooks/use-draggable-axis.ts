import {useEffect} from "react"
import {AxisPlace, IAxisModel, INumericAxisModel} from "../models/axis-model"
import {drag, select} from "d3"
import {ScaleNumericBaseType, ScaleType} from "../models/graph-layout"

type D3Handler = (this: Element, event: any, d: any) => void

interface IProps {
  axisElt: SVGGElement | null
  place: AxisPlace
  transform: string
  length: number
  model: IAxisModel
  scale: ScaleType | undefined
}

const axisDragHints = ['Drag to change axis lower bound',
  'Drag to translate the axis',
  'Drag to change axis upper bound']

export const useDraggableAxis = ({axisElt, place, transform, length, model, scale}: IProps) => {

  useEffect(function createAndRefresh() {
    const isNumeric = model.isNumeric,
      numericModel = isNumeric ? (model as INumericAxisModel) : null,
      numericScale = isNumeric && scale ? (scale as ScaleNumericBaseType) : null
    let scaleAtStart: any = null,
      lowerAtStart: number,
      upperAtStart: number,
      dilationAnchorCoord: number,
      dragging = false

    const onDragStart: D3Handler = () => {
        if (numericScale) {
          select(this as Element)
            .classed('dragging', true)
        }
      },

      onDilateStart: D3Handler = (event: { x: number, y: number }) => {
        if (numericScale) {
          select(this)
            .classed('dragging', true)
          scaleAtStart = scale?.copy()
          lowerAtStart = scaleAtStart.domain()[0]
          upperAtStart = scaleAtStart.domain()[1]
          dilationAnchorCoord = Number(place === 'bottom' ? numericScale.invert(event.x) :
            numericScale.invert(event.y))
          dragging = true
        }
      },

      onLowerDilateDrag = (event: { x: number, y: number, dx: number, dy: number }) => {
        const delta = -(place === 'bottom' ? event.dx : event.dy)
        if (dragging && delta !== 0) {
          const
            x2 = place === 'bottom' ? scaleAtStart.invert(event.x) : scaleAtStart.invert(event.y),
            ratio = (upperAtStart - x2) / (upperAtStart - dilationAnchorCoord),
            newRange = (upperAtStart - lowerAtStart) / ratio,
            newLowerBound = upperAtStart - newRange
          numericModel?.setDomain(newLowerBound, upperAtStart)
        }
      },

      onDragTranslate = (event: { dx: number; dy: number }) => {
        if (numericScale) {
          const delta = -(place === 'bottom' ? event.dx : event.dy)
          if (delta !== 0) {
            const worldDelta = Number(numericScale.invert(delta)) - Number(numericScale.invert(0))
            numericModel?.setDomain(numericModel?.min + worldDelta, numericModel?.max + worldDelta)
          }
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
          numericModel?.setDomain(lowerAtStart, newUpperBound)
        }
      },

      onDragEnd = () => {
        select(this)
          .classed('dragging', false)
        scaleAtStart = null
        dragging = false
      }

    if (axisElt) {
      const axisSelection = select(axisElt)
        .attr("transform", transform)

      if (isNumeric) {
        // Add three rects in which the user can drag to dilate or translate the scale
        const tLength = length || 0,
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
              .on("end", onDragEnd)],
          bbox = axisElt?.getBBox?.()
        axisSelection
          .selectAll('.dragRect')
          .data(numbering)// data signify lower, middle, upper rectangles
          .join(
            // @ts-expect-error void => Selection
            (enter) => {
              enter.append('rect')
                .attr('class', (d) => `dragRect ${classPrefix}-${classPostfixes[d]}`)
                .append('title')
                .text((d: number) => axisDragHints[numbering[d]])
            },
            (update) => {
              update
                .attr('x', (d) => bbox?.x + (place === 'bottom' ? (d * tLength / 3) : 0))
                .attr('y', (d) => bbox?.y + (place === 'bottom' ? 0 : (d * tLength / 3)))
                .attr('width', () => (place === 'bottom' ? tLength / 3 : bbox?.width))
                .attr('height', () => (place === 'bottom' ? bbox?.height : tLength / 3))
            }
          )
        numbering.forEach((behaviorIndex, axisIndex) => {
          axisSelection.select(`.dragRect.${classPrefix}-${classPostfixes[axisIndex]}`)
            .call(dragBehavior[behaviorIndex])
        })
        axisSelection.selectAll('.dragRect').raise()
      }
    }
  }, [axisElt, length, model, place, scale, transform])

}
