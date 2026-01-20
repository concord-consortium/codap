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
  showZeroAxisLine?: boolean
}

export const Axis = observer(function Axis ({
                       axisPlace, showScatterPlotGridLines = false, showZeroAxisLine = false,
                     }: IProps) {
  const layout = useAxisLayoutContext()

  useAxis(axisPlace)

  const renderSubAxes = () => {
    const numRepetitions = layout.getAxisMultiScale(axisPlace)?.repetitions ?? 1
    return range(numRepetitions).map(i => {
      return <SubAxis key={i}
                      numSubAxes={numRepetitions}
                      subAxisIndex={i}
                      axisPlace={axisPlace}
                      showScatterPlotGridLines={showScatterPlotGridLines}
                      showZeroAxisLine={showZeroAxisLine}
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
