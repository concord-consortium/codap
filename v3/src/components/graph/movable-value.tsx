import React, {useCallback, useEffect, useRef, useState} from "react"
import {drag, ScaleLinear, select} from "d3"
import {valueLabelString} from "./graph-utils/graph_utils"


export const MovableValue = (props: {
  transform: string
  value: number
  setValue: React.Dispatch<React.SetStateAction<number>>
  xScale: ScaleLinear<number, number>
  yScale: ScaleLinear<number, number>
}) => {
  const { xScale: x, yScale: y, value, setValue, transform} = props,
    valueRef = useRef<SVGSVGElement>(null),
    [xMin, xMax] = x.domain(),
    [xRangeMin, xRangeMax] = x.range(),
    [bottom, top] = y.range(),
    [valueObject, setValueObject] = useState<Record<string, any>>({
      line: null, cover: null, valueLabel: null
    })
  // Refresh the line
  useEffect(function refresh() {
      if (!valueObject.line) {
        return
      }

      function refreshValueLabel() {
        // Todo: Derive the 60
        const screenX = x(value) + 60,
          screenY = Number(valueRef.current?.getBoundingClientRect().top) - 12,
          string = valueLabelString(value)
        select('div.movable-value-label')
          .style('left', `${screenX}px`)
          .style('top', `${screenY}px`)
          .html(string)
      }

      [valueObject.line, valueObject.cover].forEach(aLine => {
        aLine
          .attr('transform', transform)
          .attr('x1', x(value))
          .attr('y1', top)
          .attr('x2', x(value))
          .attr('y2', bottom)
      })
      refreshValueLabel()
    }, [valueObject, transform, x, value, bottom, top, xMin, xMax, xRangeMin, xRangeMax]
  )

  const
    dragValue = useCallback((event: MouseEvent) => {
      // Todo: Derive the 60
      setValue(x.invert(event.x - 60))
    }, [x, setValue])

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
    newValueObject.cover = selection.append('line')
      .attr('class', 'movable-value-cover')
    newValueObject.valueLabel = select('.plot').append('div')
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
  }, [])

  return (
    <g>
      <g ref={valueRef}/>
    </g>
  )
}
