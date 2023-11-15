import React from "react"
import {range} from "d3"
import {AxisPlace} from "../axis-types"
import {useAxis} from "../hooks/use-axis"
import {useAxisLayoutContext} from "../models/axis-layout-context"
import {SubAxis} from "./sub-axis"

import "./axis.scss"

interface IProps {
  axisPlace: AxisPlace
  getAnimationEnabled: () => boolean
  stopAnimation: () => void
  showScatterPlotGridLines?: boolean
  centerCategoryLabels?: boolean
}

export const Axis = ({
                       axisPlace, showScatterPlotGridLines = false,
                       getAnimationEnabled, stopAnimation,
                       centerCategoryLabels = true,
                     }: IProps) => {
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
                      getAnimationEnabled={getAnimationEnabled}
                      stopAnimation={stopAnimation}
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
}
