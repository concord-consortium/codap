import { useCallback, useEffect, useRef } from "react"
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
import { calculateSumOfSquares, curveBasis, residualsString } from "../../utilities/graph-utils"
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

function residualsContainer(model: IPlottedFunctionAdornmentModel,
                            cellKey: Record<string, string>, containerId: string) {
  const classFromKey = model.classNameFromKey(cellKey)
  const residualsContainerClass = `plotted-function-equation-container-${classFromKey}`
  const residualsContainerSelector = `#${containerId} .${residualsContainerClass}`

  return { residualsContainerClass, residualsContainerSelector }
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
  const {cellKey = {}, containerId, plotWidth, plotHeight, xAxis, yAxis} = props
  const model = props.model as IPlottedFunctionAdornmentModel
  const graphModel = useGraphContentModelContext()
  const dataConfig = useGraphDataConfigurationContext()
  const showSumSquares = graphModel?.adornmentsStore.showSquaresOfResiduals
  const { xScale, yScale } = useAdornmentAttributes()
  const { cellCounts, classFromKey, instanceKey } = useAdornmentCells(model, cellKey)
  const { xSubAxesCount } = useAdornmentCategories()
  const {residualsContainerClass, residualsContainerSelector} = residualsContainer(model, cellKey, containerId)
  const path = useRef("")
  const plottedFunctionRef = useRef<SVGGElement>(null)

  const refreshResiduals = useCallback((plottedFunc: FormulaFn) => {
    if (!showSumSquares || !dataConfig) return
    const sumOfSquares = calculateSumOfSquares({ cellKey, dataConfig, computeY: plottedFunc })
    const string = residualsString(sumOfSquares, false)
    const residualsParagraph = select(residualsContainerSelector).select("p")

    select(residualsContainerSelector)
      .style("width", `${plotWidth}px`)
      .style("height", `${plotHeight}px`)
    residualsParagraph.html(string)
    residualsParagraph.style("left", '0px')
      .style("top", '0px')
  }, [cellKey, dataConfig, residualsContainerSelector, plotHeight, plotWidth, showSumSquares])
  
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
    path.current = `M${tPoints[0].x} ${tPoints[0].y} ${curveBasis(tPoints)}`

    const selection = select(plottedFunctionRef.current)
    selection.append("path")
      .attr("class", `plotted-function plotted-function-${classFromKey}`)
      .attr("data-testid", `plotted-function-path${classFromKey ? `-${classFromKey}` : ""}`)
      .attr("d", path.current)

  }, [cellCounts, classFromKey, model, xScale, yScale])

  // Add the lines and their associated covers and labels
  const refreshValues = useCallback(() => {
    if (!model.isVisible) return

    const plottedFunctionMeasure = model?.plottedFunctions.get(instanceKey)
    const selection = select(plottedFunctionRef.current)

    // Remove the previous value's elements
    selection.html(null)

    if (plottedFunctionMeasure) {
      addPath(plottedFunctionMeasure.formulaFunction)
      refreshResiduals(plottedFunctionMeasure.formulaFunction)
    }
  }, [model.isVisible, model?.plottedFunctions, instanceKey, addPath, refreshResiduals])

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
      // from triggering a reinstallation of the autorun.
      if (xAxis && yAxis) {
        const { domain: xDomain } = xAxis // eslint-disable-line @typescript-eslint/no-unused-vars
        const { domain: yDomain } = yAxis // eslint-disable-line @typescript-eslint/no-unused-vars
      }
      refreshValues()
    }, { name: "PlottedFunctionAdornmentComponent.refreshAxisChange" }, model)
  }, [dataConfig, model, plotWidth, plotHeight, refreshValues, xAxis, yAxis])

  // Build the line and its cover segments and handles just once
  useEffect(function createResidualsBox() {
    // Set up the text box for the residuals
    // Define the selector that corresponds with this specific movable line's adornment container
    const residualsBox = select(`#${containerId}`).append("div")
      .attr("class", `plotted-function-equation-container ${residualsContainerClass}`)
      .attr("data-testid", `${residualsContainerClass}`)
      .style("width", `${plotWidth}px`)
      .style("height", `${plotHeight}px`)

    residualsBox
      .append("p")
      .attr("class", "plotted-functions-residuals")
      .attr("data-testid", `plotted-functions-residuals-${model.classNameFromKey(cellKey)}`)

    return () => {
      residualsBox.remove()
    }
    // This effect should only run once on mount, otherwise it would create multiple
    // instances of the line elements
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
