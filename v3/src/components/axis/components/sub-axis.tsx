import React, {MutableRefObject, useRef, useState} from "react"
import {useSubAxis} from "../hooks/use-sub-axis"
import {IAxisModel, INumericAxisModel} from "../models/axis-model"
import {AxisDragRects} from "./axis-drag-rects"

import "./axis.scss"

interface ISubAxisProps {
  subAxisIndex: number
  getAxisModel: () => IAxisModel | undefined
  enableAnimation: MutableRefObject<boolean>
  showScatterPlotGridLines?: boolean
  centerCategoryLabels?: boolean
}


export const SubAxis = ({
                          subAxisIndex, getAxisModel, showScatterPlotGridLines = false,
                          centerCategoryLabels = true, enableAnimation
                        }: ISubAxisProps) => {
  const
    axisModel = getAxisModel(),
    place = axisModel?.place || 'bottom',
    subWrapperElt = useRef<SVGGElement | null>(null),
    [subAxisElt, setSubAxisElt] = useState<SVGGElement | null>(null)


  useSubAxis({
    subAxisIndex, axisModel, subAxisElt, enableAnimation, showScatterPlotGridLines, centerCategoryLabels
  })

  return (
    <g className='axis-wrapper' ref={subWrapperElt}>
      <g className='axis' ref={elt => setSubAxisElt(elt)} data-testid={`axis-${place}`}/>
      {axisModel?.type === 'numeric'
        ? <AxisDragRects axisModel={axisModel as INumericAxisModel} axisWrapperElt={subWrapperElt.current}/> : null}
    </g>
  )
}
