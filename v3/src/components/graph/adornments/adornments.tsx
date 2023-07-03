import React from "react"
import { useGraphLayoutContext } from "../models/graph-layout"
import { AxisScaleType } from "../../axis/axis-types"
import { kGraphAdornmentsClass } from "../graphing-types"
import { useGraphModelContext } from "../models/graph-model"
import { observer } from "mobx-react-lite"
import { IAdornmentModel } from "./adornment-models"
import { Adornment } from "./adornment"
import { useInstanceIdContext } from "../../../hooks/use-instance-id-context"

import "./adornments.scss"

export const Adornments = observer(function Adornments() {
  const graphModel = useGraphModelContext(),
    instanceId = useInstanceIdContext(),
    layout = useGraphLayoutContext(),
    adornments = graphModel.adornments

  if (!adornments?.length) return null

  const setCategories = () => {
    // Build an array containing each category label present in the top axis
    const topAxisMultiScale = layout.getAxisMultiScale('top'),
      topAxisLength = topAxisMultiScale?.cellLength ?? 0,
      topAxisRangeMin = topAxisLength,
      topAxisRangeMax = topAxisRangeMin + topAxisLength,
      topAxisScale = topAxisMultiScale?.scale.copy()
        .range([topAxisRangeMin, topAxisRangeMax]) as AxisScaleType,
      xCatLabels = topAxisScale.domain() ?? []

    // Build an array containing each category label present in the right axis
    const rightAxisMultiScale = layout.getAxisMultiScale('rightCat'),
      rightAxisLength = rightAxisMultiScale?.cellLength ?? 0,
      rightAxisRangeMin = rightAxisLength,
      rightAxisRangeMax = rightAxisRangeMin + rightAxisLength,
      rightAxisScale = rightAxisMultiScale?.scale.copy()
        .range([rightAxisRangeMin, rightAxisRangeMax]) as AxisScaleType,
      yCatLabels = rightAxisScale.domain() ?? []

    return { xCategories: xCatLabels, yCategories: yCatLabels }
  }

  // When a graph contains multiple sub-plots, each adornment needs to be rendered once
  // per sub-plot. We create a CSS grid in which to place the adornments, with each cell
  // of the grid corresponding to one sub-plot.
  const { xCategories, yCategories } = setCategories(),
    colCount = xCategories.length,
    rowCount = yCategories.length,
    { left, top, width, height } = layout.computedBounds.plot,
    cellsRequired = Math.max(1, colCount) * Math.max(1, rowCount),
    gridTemplateColumns = `repeat(${colCount}, 1fr)`,
    gridTemplateRows = `repeat(${rowCount}, 1fr)`,
    gridStyle = {
      gridTemplateColumns,
      gridTemplateRows,
      height,
      left,
      top,
      width,
    }
  let cellsRendered = 0

  const adornmentNodes = []
  while (cellsRendered < cellsRequired) {
    adornmentNodes.push(
      <div key={`graph-adornments-cell-${cellsRendered}`} className="graph-adornments-grid__cell">
        {
          adornments.map((adornment: IAdornmentModel) => {
            return <Adornment
                     key={`graph-adornment-${adornment.id}-${cellsRendered}`}
                     adornment={adornment}
                     index={cellsRendered}
                     xCategories={xCategories}
                     yCategories={yCategories}
                   />
          })
        }
      </div>
    )
    cellsRendered++
  }

  return (
    <div className={`${kGraphAdornmentsClass} ${instanceId}`} style={gridStyle}>
      {adornmentNodes}
    </div>
  )
})
