import React from "react"
import { observer } from "mobx-react-lite"
import {range} from "d3"
import {AxisPlace} from "../axis-types"
import {useAxis} from "../hooks/use-axis"
import {useAxisLayoutContext} from "../models/axis-layout-context"
import {SubAxis} from "./sub-axis"

import "./axis.scss"

interface IProps {
  axisPlace: AxisPlace
  showScatterPlotGridLines?: boolean
  centerCategoryLabels?: boolean
}

export const Axis = observer(function Axis ({
                       axisPlace, showScatterPlotGridLines = false,
                       centerCategoryLabels = true,
                     }: IProps) {
  const
    layout = useAxisLayoutContext()

  useAxis({
    axisPlace, centerCategoryLabels
  })

  const renderSubAxes = () => {
    const numRepetitions = layout.getAxisMultiScale(axisPlace)?.repetitions ?? 1
    return range(numRepetitions).map(i => {
      return <SubAxis key={i}
                      numSubAxes={numRepetitions}
                      subAxisIndex={i}
                      axisPlace={axisPlace}
                      showScatterPlotGridLines={showScatterPlotGridLines}
                      centerCategoryLabels={centerCategoryLabels}
      />
    })
  }

  return (
    <>
      <g className='axis' data-testid={`axis-${axisPlace}`}>
        {renderSubAxes()}
      </g>
    </>
  )
})
