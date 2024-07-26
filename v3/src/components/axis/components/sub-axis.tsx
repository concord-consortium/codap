import { observer } from "mobx-react-lite"
import React, {useRef, useState} from "react"
import {AxisPlace} from "../axis-types"
import { isAbstractNumericAxisModel } from "../models/axis-model"
import {useAxisProviderContext} from "../hooks/use-axis-provider-context"
import {useSubAxis} from "../hooks/use-sub-axis"
import {NumericAxisDragRects} from "./numeric-axis-drag-rects"
import { useDataDisplayModelContext } from "../../data-display/hooks/use-data-display-model"

import "./axis.scss"

interface ISubAxisProps {
  numSubAxes: number
  subAxisIndex: number
  axisPlace: AxisPlace
  showScatterPlotGridLines?: boolean
  centerCategoryLabels?: boolean
}

export const SubAxis = observer(function SubAxis({
                                               numSubAxes, subAxisIndex, axisPlace, showScatterPlotGridLines = false,
                                               centerCategoryLabels = true /*, getCategorySet*/
                                             }: ISubAxisProps) {
  const
    axisProvider = useAxisProviderContext(),
    axisModel = axisProvider.getAxis?.(axisPlace),
    displayModel = useDataDisplayModelContext(),
    subWrapperElt = useRef<SVGGElement | null>(null),
    [subAxisElt, setSubAxisElt] = useState<SVGGElement | null>(null)

  useSubAxis({
    subAxisIndex, axisPlace, subAxisElt, showScatterPlotGridLines, centerCategoryLabels
  })

  return (
    <g className='sub-axis-wrapper' ref={subWrapperElt}>
      <g className='axis' ref={elt => setSubAxisElt(elt)}/>
      {isAbstractNumericAxisModel(axisModel) && displayModel.hasDraggableNumericAxis(axisModel) &&
        <NumericAxisDragRects
          axisModel={axisModel}
          axisWrapperElt={subWrapperElt.current}
          numSubAxes={numSubAxes}
          subAxisIndex={subAxisIndex}
        />
      }
    </g>
  )
})
