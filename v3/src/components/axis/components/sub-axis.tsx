import React, {memo, MutableRefObject, useRef, useState} from "react"
import {useSubAxis} from "../hooks/use-sub-axis"
import {IAxisModel, INumericAxisModel} from "../models/axis-model"
import {NumericAxisDragRects} from "./numeric-axis-drag-rects"

import "./axis.scss"

interface ISubAxisProps {
  numSubAxes: number
  subAxisIndex: number
  axisModel: IAxisModel
  enableAnimation: MutableRefObject<boolean>
  showScatterPlotGridLines?: boolean
  centerCategoryLabels?: boolean
}

export const SubAxis = memo(function SubAxis({
                          numSubAxes, subAxisIndex, axisModel, showScatterPlotGridLines = false,
                          centerCategoryLabels = true, enableAnimation/*, getCategorySet*/
                        }: ISubAxisProps) {
  const
    subWrapperElt = useRef<SVGGElement | null>(null),
    [subAxisElt, setSubAxisElt] = useState<SVGGElement | null>(null)


  useSubAxis({
    subAxisIndex, axisModel, subAxisElt, enableAnimation, showScatterPlotGridLines, centerCategoryLabels
  })

  return (
    <g className='sub-axis-wrapper' ref={subWrapperElt}>
      <g className='axis' ref={elt => setSubAxisElt(elt)}/>
      {axisModel?.type === 'numeric'
        ? <NumericAxisDragRects
          axisModel={axisModel as INumericAxisModel}
          axisWrapperElt={subWrapperElt.current}
          numSubAxes={numSubAxes}
          subAxisIndex={subAxisIndex}
        />
        : null
        /* : axisModel?.type === 'categorical'
          ? <CategoricalAxisDragRects
            axisModel={axisModel as ICategoricalAxisModel}
            axisWrapperElt={subWrapperElt.current}
            numSubAxes={numSubAxes}
            subAxisIndex={subAxisIndex}
            getCategorySet={getCategorySet}
          /> :*/
          }
    </g>
  )
})
