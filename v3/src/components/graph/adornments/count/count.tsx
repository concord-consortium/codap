import React, { useCallback, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { select } from "d3"
import { INumericAxisModel } from "../../../axis/models/axis-model"
import { ICountModel } from "./count-model"
import { useDataConfigurationContext } from "../../hooks/use-data-configuration-context"
import { useInstanceIdContext } from "../../../../hooks/use-instance-id-context"
import { transitionDuration } from "../../graphing-types"

import "./count.scss"

interface IProps {
  containerId: string
  instanceKey?: string
  model: ICountModel
  plotHeight: number
  plotIndex: number
  plotWidth: number
  xAxis: INumericAxisModel
  yAxis: INumericAxisModel
}

export const Count = observer(function Count(props: IProps) {
  const {plotHeight, plotIndex, plotWidth} = props,
    instance = useInstanceIdContext(),
    dataConfig = useDataConfigurationContext(),
    dataset = dataConfig?.dataset,
    numCols = dataConfig?.numRepetitionsForPlace('bottom') ?? 1,
    numRows = dataConfig?.numRepetitionsForPlace('left') ?? 1,
    [caseCount, setCaseCount] = useState(0)

  const getCoordinates = useCallback((caseID: string) => {
    const svgSelector = `#${instance}_${caseID}`
    const caseCircle = select(svgSelector)
    if (caseCircle.empty()) return { x: null, y: null }
    const x = caseCircle.attr("cx")
    const y = caseCircle.attr("cy")
    return {
      x: Number(x) ?? 0,
      y: Number(y) ?? 0
    }
  }, [instance])

  useEffect(() => {
    setTimeout(() => {
      const row = (index: number) => Math.floor(index / numCols),
        col = (index: number) => index % numCols,
        plotXLeft = numCols === 1 ? 0 : (plotWidth * col(plotIndex)),
        plotXRight = plotXLeft + plotWidth,
        plotYTop = numRows === 1 ? 0 : (plotHeight * row(plotIndex)),
        plotYBottom = plotYTop + plotHeight,
        casesInPlot = dataset?.cases.filter((c) => {
          const { x, y } = getCoordinates(c.__id__)
          return x && x >= plotXLeft && x <= plotXRight &&
                y && y >= plotYTop && y <= plotYBottom
        })
      casesInPlot?.length && setCaseCount(casesInPlot.length)
    }, transitionDuration)
  }, [dataset?.cases, setCaseCount, getCoordinates, plotWidth, plotIndex,
      plotHeight, numCols, numRows])

  return (
    <div className="graph-count">
      {caseCount}
    </div>
  )
})
