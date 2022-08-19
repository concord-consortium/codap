import React, {useCallback, useEffect, useRef, useState} from "react"
import {drag, select} from "d3"
import {autorun, reaction} from "mobx"
import {IMovableValueModel} from "./adornment-models"
import { kGraphClassSelector } from "../graphing-types"
import { INumericAxisModel } from "../models/axis-model"
import { useGraphLayoutContext } from "../models/graph-layout"
import {valueLabelString} from "../utilities/graph_utils"
import "./movable-value.scss"

export const MovableValue = (props: {
  model: IMovableValueModel
  axis: INumericAxisModel
  transform: string
}) => {
  const {model, axis, transform} = props,
    layout = useGraphLayoutContext(),
    { margin } = layout,
    xScale = layout.axisScale("bottom"),
    yScale = layout.axisScale("left"),
    valueRef = useRef<SVGSVGElement>(null),
    [bottom, top] = yScale.range(),
    [valueObject, setValueObject] = useState<Record<string, any>>({
      line: null, cover: null, valueLabel: null
    })

  const refreshValue = useCallback((value: number) => {
    const { line, cover } = valueObject
    if (!line) return

    [line, cover].forEach(aLine => {
      aLine
        .attr('x1', xScale(value))
        .attr('y1', top)
        .attr('x2', xScale(value))
        .attr('y2', bottom)
    })
  }, [bottom, top, valueObject, xScale])

  const refreshValueLabel = useCallback((value: number) => {
    const leftEdge = margin.left,
      screenX = xScale(value) + (leftEdge || 0),
      string = valueLabelString(value)
    select('div.movable-value-label')
      .style('left', `${screenX}px`)
      .style('top', 0)
      .html(string)
  }, [xScale, margin.left])

  // Refresh the value when it changes
  useEffect(function refreshValueChange() {
    const disposer = autorun(() => {
      const { value } = model
      refreshValue(value)
      refreshValueLabel(value)
    })
    return () => disposer()
  }, [model, refreshValue, refreshValueLabel])

  // Refresh the value when the axis changes
  useEffect(function refreshAxisChange() {
    const disposer = reaction(
      () => {
        const { domain } = axis
        return domain
      },
      domain => {
        const { value } = model
        refreshValue(value)
        refreshValueLabel(value)
      }
    )
    return () => disposer()
  }, [axis, model, refreshValue, refreshValueLabel])

  const
    dragValue = useCallback((event: MouseEvent) => {
      model.setValue(xScale.invert(event.x - margin.left))
    }, [margin.left, model, xScale])

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
    newValueObject.valueLabel = select(kGraphClassSelector).append('div')
      .attr('class', 'movable-value-label')
    setValueObject(newValueObject)

    return () => {
      newValueObject.valueLabel
        .transition()
        .duration(1000)
        .style('opacity', 0)
        .end().then(() => {
        newValueObject.valueLabel.remove()
      })
    }
  }, [transform])

  return (
    <g ref={valueRef}/>
  )
}
