import React, {useCallback, useEffect, useRef, useState} from "react"
import {drag, ScaleLinear, select} from "d3"
import {valueLabelString} from "../utilities/graph_utils"
import "./movable-value.scss"
import {IMovableValueModel} from "./adornment-models"
import {autorun} from "mobx"


export const MovableValue = (props: {
  transform: string
  model: IMovableValueModel
  xScale: ScaleLinear<number, number>
  yScale: ScaleLinear<number, number>
}) => {
  const {xScale: x, yScale: y, model, transform} = props,
    valueRef = useRef<SVGSVGElement>(null),
    [xMin, xMax] = x.domain(),
    [xRangeMin, xRangeMax] = x.range(),
    [bottom, top] = y.range(),
    [valueObject, setValueObject] = useState<Record<string, any>>({
      line: null, cover: null, valueLabel: null
    })

  // Refresh the value
  useEffect(function refresh() {
      const disposer = autorun(() => {
        if (!valueObject.line) {
          return
        }
        const value = model.value

        function refreshValueLabel() {
          const leftEdge = valueRef.current?.parentElement?.getBoundingClientRect().left,
            screenX = x(value) + (leftEdge || 0),
            screenY = Number(valueRef.current?.getBoundingClientRect().top) - 12,
            string = valueLabelString(value)
          select('div.movable-value-label')
            .style('left', `${screenX}px`)
            .style('top', `${screenY}px`)
            .html(string)
        }
        [valueObject.line, valueObject.cover].forEach(aLine => {
          aLine
            // .attr('transform', transform)
            .attr('x1', x(value))
            .attr('y1', top)
            .attr('x2', x(value))
            .attr('y2', bottom)
        })
        refreshValueLabel()
      })
      return () => disposer()
    }, [valueObject, bottom, model, top, x, xMin, xMax, xRangeMin, xRangeMax]
  )

  const
    dragValue = useCallback((event: MouseEvent) => {
      // Todo: Derive the 60
      model.setValue(x.invert(event.x - 60))
    }, [model, x])

  // Add the behavior to the line cover
  useEffect(function addBehaviors() {
    valueObject.cover?.call(drag().on('drag', dragValue))
  }, [valueObject, dragValue])

  // Make the line and its cover segments just once
  useEffect(function createElements() {
    const selection = select(valueRef.current),
      newValueObject: any = {}
    newValueObject.line = selection.append('line')
      .attr('class', 'movable-value')
      .attr('transform', transform)
    newValueObject.cover = selection.append('line')
      .attr('class', 'movable-value-cover')
      .attr('transform', transform)
    newValueObject.valueLabel = select('.graph-plot').append('div')
      .attr('class', 'movable-value-container')
      .attr('class', 'movable-value-label')
    setValueObject(newValueObject)

    return () => {
      newValueObject.valueLabel
        .transition()
        .duration(1000)
        .style('opacity', 0)
      newValueObject.valueLabel.transition()
        .duration(1000)
        .remove()
    }
  }, [transform])

  return (
    <g ref={valueRef}/>
  )
}
