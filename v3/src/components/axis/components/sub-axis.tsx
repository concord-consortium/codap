import { observer } from "mobx-react-lite"
import React, {useRef, useState} from "react"
import {AxisPlace} from "../axis-types"
import {useAxisProviderContext} from "../hooks/use-axis-provider-context"
import {useSubAxis} from "../hooks/use-sub-axis"
import {isNumericAxisModel} from "../models/axis-model"
import {NumericAxisDragRects} from "./numeric-axis-drag-rects"
import { useGraphContentModelContext } from "../../graph/hooks/use-graph-content-model-context"

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
    graphModel = useGraphContentModelContext(),
    pointDisplayType = graphModel?.pointDisplayType,
    subWrapperElt = useRef<SVGGElement | null>(null),
    [subAxisElt, setSubAxisElt] = useState<SVGGElement | null>(null)

  useSubAxis({
    subAxisIndex, axisPlace, subAxisElt, showScatterPlotGridLines, centerCategoryLabels
  })

  return (
    <g className='sub-axis-wrapper' ref={subWrapperElt}>
      <g className='axis' ref={elt => setSubAxisElt(elt)}/>
      {isNumericAxisModel(axisModel) && pointDisplayType !== "bins"
        ? <NumericAxisDragRects
          axisModel={axisModel}
          axisWrapperElt={subWrapperElt.current}
          numSubAxes={numSubAxes}
          subAxisIndex={subAxisIndex}
        />
        : null
      }
    </g>
  )
})
