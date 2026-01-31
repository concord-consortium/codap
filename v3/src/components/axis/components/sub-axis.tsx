import { observer } from "mobx-react-lite"
import {useRef} from "react"
import {AxisPlace} from "../axis-types"
import {useAxisProviderContext} from "../hooks/use-axis-provider-context"
import {useSubAxis} from "../hooks/use-sub-axis"
import { isAnyNumericAxisModel } from "../models/numeric-axis-models"
import {NumericAxisDragRects} from "./numeric-axis-drag-rects"

import "./axis.scss"

interface ISubAxisProps {
  numSubAxes: number
  subAxisIndex: number
  axisPlace: AxisPlace
  showScatterPlotGridLines?: boolean
  showZeroAxisLine?: boolean
  centerCategoryLabels?: boolean
}

export const SubAxis = observer(function SubAxis({
                                               numSubAxes, subAxisIndex, axisPlace, showScatterPlotGridLines = false,
                                               showZeroAxisLine = false,
                                               centerCategoryLabels = true /*, getCategorySet*/
                                             }: ISubAxisProps) {
  const
    axisProvider = useAxisProviderContext(),
    axisModel = axisProvider.getAxis?.(axisPlace),
    subWrapperElt = useRef<SVGGElement | null>(null),
    // Kirk notes that we sometimes use state to store refs so that we get an additional render.
    // If we encounter "one-render-behind bugs in the axis world, we should consider this approach.
    subAxisEltRef = useRef<SVGGElement | null>(null)

  useSubAxis({
    subAxisIndex, axisPlace, subAxisEltRef, showScatterPlotGridLines, centerCategoryLabels, showZeroAxisLine
  })

  return (
    <g className='sub-axis-wrapper' ref={subWrapperElt}>
      <g className='axis' ref={subAxisEltRef}/>
      {isAnyNumericAxisModel(axisModel) && axisProvider.hasDraggableNumericAxis(axisModel) &&
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
