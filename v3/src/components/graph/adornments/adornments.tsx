import React from "react"
import { useGraphLayoutContext } from "../models/graph-layout"
import { AxisScaleType } from "../../axis/axis-types"
import { kGraphAdornmentsClass } from "../graphing-types"
import { useGraphModelContext } from "../models/graph-model"
import { MovableLine } from "./movable-line"
import { INumericAxisModel } from "../../axis/models/axis-model"
import { observer } from "mobx-react-lite"
import { IAdornmentModelUnion, IMovableLineModel } from "./adornment-models"

import "./adornments.scss"

export const Adornments = observer(function Adornments() {
  const graphModel = useGraphModelContext(),
    layout = useGraphLayoutContext(),
    adornments = graphModel.adornments

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

  const setAdornmentNode = (
    adornment: IAdornmentModelUnion,
    index: number,
    xCatLabels: string[] | number[],
    yCatLabels: string[] | number[]
  ) => {
    const subPlotWidth = xCatLabels.length > 0
                           ? layout.plotWidth / xCatLabels.length
                           : layout.plotWidth
    const subPlotHeight = yCatLabels.length > 0
                           ? layout.plotHeight / yCatLabels.length
                           : layout.plotHeight
    // The instanceKey is used by the adornment model to uniquely identify an instance of the adornment in its
    // map of instances. If there is only one instance of the adornment, the instanceKey is an empty string.
    const instanceKey = xCatLabels.length === 0 && yCatLabels.length === 0
        ? ''
        : xCatLabels.length > 0
          ? yCatLabels.length > 0
            ? `{x: ${xCatLabels[index % xCatLabels.length]}, y: ${yCatLabels[Math.floor(index / xCatLabels.length)]}}`
            : `{x: ${xCatLabels[index]}}`
          : `{y: ${yCatLabels[index]}}`
    // The adornmentKey is a unique value used for React's key prop. We can't use the instanceKey because that
    // value may be duplicated if there are multiple adornment types active on the graph.
    const adornmentKey = `${adornment.id}${instanceKey ? `-${instanceKey}` : ''}`
    // TODO: Handle other types of adornments
    if (adornment.type === "Movable Line") {
      return (
        <MovableLine
          key={adornmentKey}
          lineKey={instanceKey}
          model={adornment as IMovableLineModel}
          plotHeight={subPlotHeight}
          plotIndex={index}
          plotWidth={subPlotWidth}
          xAxis={graphModel.getAxis('bottom') as INumericAxisModel}
          yAxis={graphModel.getAxis('left') as INumericAxisModel}
        />
      )
    }
    return null
  }

  // When a graph contains multiple sub-plots, each adornment needs to be rendered once
  // per sub-plot. We create a CSS grid in which to place the adornments, with each cell
  // of the grid corresponding to one sub-plot.
  const { xCategories, yCategories } = setCategories(),
    colCount = xCategories.length,
    rowCount = yCategories.length,
    { left, top, width, height } = layout.computedBounds.plot,
    cellsRequired = (colCount > 0 ? colCount : 1) * (rowCount > 0 ? rowCount : 1),
    gridTemplateColumns = `repeat(${colCount}, 1fr)`,
    gridTemplateRows = `repeat(${rowCount}, 1fr)`,
    gridStyle = {
      gridTemplateColumns,
      gridTemplateRows,
      height: `${height}px`,
      left,
      top,
      width: `${width}px`,
    }
  let cellsRendered = 0

  const renderAdornments = () => {
    const adornmentNodes = []
    while (cellsRendered < cellsRequired) {
      adornmentNodes.push(
        <div key={`graph-adornments-cell-${cellsRendered}`} className="graph-adornments-grid__cell">
          {
            adornments.map((adornment: IAdornmentModelUnion) => {
              return setAdornmentNode(adornment, cellsRendered, xCategories, yCategories)
            })
          }
        </div>
      )
      cellsRendered++
    }
    return adornmentNodes
  }

  return (
    <div className={kGraphAdornmentsClass} style={gridStyle}>
      {renderAdornments()}
    </div>
  )
})
