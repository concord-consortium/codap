import React, {MutableRefObject, useRef, useState} from "react"
import {useSubAxis} from "../hooks/use-sub-axis"
import {IAxisModel, INumericAxisModel} from "../models/axis-model"
import {NumericAxisDragRects} from "./numeric-axis-drag-rects"

import "./axis.scss"

interface ISubAxisProps {
  numSubAxes: number
  subAxisIndex: number
  getAxisModel: () => IAxisModel | undefined
  enableAnimation: MutableRefObject<boolean>
  showScatterPlotGridLines?: boolean
  centerCategoryLabels?: boolean
  // getCategorySet?: () => ICategorySet | undefined  // only used for categorical axes
}


export const SubAxis = ({
                          numSubAxes, subAxisIndex, getAxisModel, showScatterPlotGridLines = false,
                          centerCategoryLabels = true, enableAnimation/*, getCategorySet*/
                        }: ISubAxisProps) => {
  const
    axisModel = getAxisModel(),
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
}
