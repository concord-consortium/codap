import React, { useCallback, useEffect, useRef } from "react"
import { select } from "d3"
import { observer } from "mobx-react-lite"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { ScaleNumericBaseType } from "../../../axis/axis-types"
import { Point } from "../../../data-display/data-display-types"
import { IAdornmentComponentProps } from "../adornment-component-info"
import { IPlottedFunctionAdornmentModel, isPlottedFunctionAdornment } from "./plotted-function-adornment-model"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { useGraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"
import { useAdornmentAttributes } from "../../hooks/use-adornment-attributes"
import { useAdornmentCategories } from "../../hooks/use-adornment-categories"
import { useAdornmentCells } from "../../hooks/use-adornment-cells"
import { curveBasis } from "../../utilities/graph-utils"
import { FormulaFn } from "./plotted-function-adornment-types"

import "./plotted-function-adornment-component.scss"

interface IComputePointsOptions {
  formulaFunction: FormulaFn,
  min: number,
  max: number,
  cellCounts: { x: number, y: number }
  gap: number,
  xScale: ScaleNumericBaseType,
  yScale: ScaleNumericBaseType
}

const computePoints = (options: IComputePointsOptions) => {
  const { min, max, cellCounts, gap, xScale, yScale, formulaFunction } = options
  const tPoints: Point[] = []
  for (let pixelX = min; pixelX <= max; pixelX += gap) {
    const tX = xScale.invert(pixelX * cellCounts.x)
    const tY = formulaFunction(tX)
    if (Number.isFinite(tY)) {
      const pixelY = yScale(tY) / cellCounts.y
      tPoints.push({ x: pixelX, y: pixelY })
    }
  }
  return tPoints
}

export const PlottedFunctionAdornmentComponent = observer(function PlottedFunctionAdornment(
  props: IAdornmentComponentProps
) {
  const {cellKey = {}, plotWidth, plotHeight, xAxis, yAxis} = props
  const model = props.model as IPlottedFunctionAdornmentModel
  const graphModel = useGraphContentModelContext()
  const dataConfig = useGraphDataConfigurationContext()
  const { xScale, yScale } = useAdornmentAttributes()
  const { cellCounts, classFromKey, instanceKey } = useAdornmentCells(model, cellKey)
  const { xSubAxesCount } = useAdornmentCategories()
  const path = useRef("")
  const plottedFunctionRef = useRef<SVGGElement>(null)

  const addPath = useCallback((formulaFunction: FormulaFn) => {
    if (!model.expression) return
    const xMin = xScale.domain()[0]
    const xMax = xScale.domain()[1]
    const tPixelMin = xScale(xMin)
    const tPixelMax = xScale(xMax)
    const kPixelGap = 1
    const tPoints = computePoints({
      formulaFunction, min: tPixelMin, max: tPixelMax, cellCounts, gap: kPixelGap, xScale, yScale
    })
    if (tPoints.length === 0) return
    path.current = `M${tPoints[0].x},${tPoints[0].y},${curveBasis(tPoints)}`

    const selection = select(plottedFunctionRef.current)
    selection.append("path")
      .attr("class", `plotted-function plotted-function-${classFromKey}`)
      .attr("data-testid", `plotted-function-path${classFromKey ? `-${classFromKey}` : ""}`)
      .attr("d", path.current)

  }, [cellCounts, classFromKey, model, xScale, yScale])

  // Add the lines and their associated covers and labels
  const refreshValues = useCallback(() => {
    if (!model.isVisible) return

    const measure = model?.plottedFunctions.get(instanceKey)
    const selection = select(plottedFunctionRef.current)

    // Remove the previous value's elements
    selection.html(null)

    if (measure) {
      addPath(measure.formulaFunction)
    }
  }, [model, instanceKey, addPath])

  // Refresh values on expression changes
  useEffect(function refreshExpressionChange() {
    return mstAutorun(() => {
      // The next line should not be needed, but without it this autorun doesn't get triggered.
      // TODO: Figure out exactly why this is needed and adjust accordingly.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const modelValue = isPlottedFunctionAdornment(model) ? model.expression : undefined
      model.updateCategories(graphModel.getUpdateCategoriesOptions(false, xScale, yScale))
    }, { name: "PlottedFunctionAdornmentComponent.refreshExpressionChange" }, model)
  }, [graphModel, model, xScale, xSubAxesCount, yScale])

  // Refresh values on axis changes
  useEffect(function refreshAxisChange() {
    return mstAutorun(() => {
      // We observe changes to the axis domains within the autorun by extracting them from the axes below.
      // We do this instead of including domains in the useEffect dependency array to prevent domain changes
      // from triggering a reinstall of the autorun.
      if (xAxis && yAxis) {
        const { domain: xDomain } = xAxis // eslint-disable-line @typescript-eslint/no-unused-vars
        const { domain: yDomain } = yAxis // eslint-disable-line @typescript-eslint/no-unused-vars
      }
      refreshValues()
    }, { name: "PlottedFunctionAdornmentComponent.refreshAxisChange" }, model)
  }, [dataConfig, model, plotWidth, plotHeight, refreshValues, xAxis, yAxis])

  return (
    <svg
      className={`plotted-function-${classFromKey}`}
      style={{height: "100%", width: "100%"}}
      x={0}
      y={0}
    >
      <g
        className={`plotted-function plotted-function-${classFromKey}`}
        ref={plottedFunctionRef}
      />
    </svg>
  )
})
