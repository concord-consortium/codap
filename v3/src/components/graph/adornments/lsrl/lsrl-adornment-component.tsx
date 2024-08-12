import React, { useCallback, useEffect, useRef } from "react"
import { observer } from "mobx-react-lite"
import { drag, select, Selection } from "d3"
import { t } from "../../../../utilities/translation/translate"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { mstReaction } from "../../../../utilities/mst-reaction"
import { Point } from "../../../data-display/data-display-types"
import { IAxisIntercepts, calculateSumOfSquares, curveBasis, lineToAxisIntercepts,
         lsrlEquationString } from "../../utilities/graph-utils"
import { IAdornmentComponentProps } from "../adornment-component-info"
import { getAxisDomains } from "../adornment-utils"
import { ILSRLAdornmentModel, ILSRLInstance } from "./lsrl-adornment-model"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { useGraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"
import { useAdornmentAttributes } from "../../hooks/use-adornment-attributes"
import { useAdornmentCells } from "../../hooks/use-adornment-cells"
import { useAdornmentCategories } from "../../hooks/use-adornment-categories"
import { useGraphLayoutContext } from "../../hooks/use-graph-layout-context"

import "./lsrl-adornment-component.scss"

function equationContainer(model: ILSRLAdornmentModel, cellKey: Record<string, string>, containerId: string) {
  const classFromKey = model.classNameFromKey(cellKey)
  const equationContainerClass = `lsrl-equation-container-${classFromKey}`
  const equationContainerSelector = `#${containerId} .${equationContainerClass}`
  return { equationContainerClass, equationContainerSelector }
}

interface ILineObject {
  confidenceBandCurve?: Selection<SVGPathElement, unknown, null, undefined>
  confidenceBandCover?: Selection<SVGPathElement, unknown, null, undefined>
  confidenceBandShading?: Selection<SVGPathElement, unknown, null, undefined>
  cover?: Selection<SVGLineElement, unknown, null, undefined>
  equation?: Selection<HTMLDivElement, unknown, HTMLElement, undefined>
  line?: Selection<SVGLineElement, unknown, null, undefined>
  range?: Selection<SVGPathElement, unknown, null, undefined>
}

export const LSRLAdornment = observer(function LSRLAdornment(props: IAdornmentComponentProps) {
  const {containerId, plotHeight, plotWidth, cellKey={}, xAxis, yAxis} = props
  const model = props.model as ILSRLAdornmentModel
  const graphModel = useGraphContentModelContext()
  const dataConfig = useGraphDataConfigurationContext()
  const layout = useGraphLayoutContext()
  const adornmentsStore = graphModel?.adornmentsStore
  const showSumSquares = graphModel?.adornmentsStore.showSquaresOfResiduals
  const { xAttrId, yAttrId, xAttrName, yAttrName, xScale, yScale } = useAdornmentAttributes()
  const { cellCounts, classFromKey } = useAdornmentCells(model, cellKey)
  const { xSubAxesCount, ySubAxesCount } = useAdornmentCategories()
  const showConfidenceBands = model.showConfidenceBands
  const interceptLocked = adornmentsStore?.interceptLocked
  const { equationContainerClass, equationContainerSelector } = equationContainer(model, cellKey, containerId)
  const lineRef = useRef() as React.RefObject<SVGSVGElement>
  const lineObjectsRef = useRef<ILineObject[]>([])
  const pointsOnAxes = useRef<IAxisIntercepts>({pt1: {x: 0, y: 0}, pt2: {x: 0, y: 0}})

  const getLines = useCallback(() => {
    return dataConfig && model.getLines(xAttrId, yAttrId, cellKey, dataConfig, interceptLocked)
  }, [cellKey, dataConfig, interceptLocked, model, xAttrId, yAttrId])

  const fixEndPoints = useCallback((iLine: Selection<SVGLineElement, unknown, null, undefined>) => {
    if (
      !Number.isFinite(pointsOnAxes.current.pt1.x) || !Number.isFinite(pointsOnAxes.current.pt2.x) ||
      !Number.isFinite(pointsOnAxes.current.pt1.y) || !Number.isFinite(pointsOnAxes.current.pt2.y)
    ) return

    iLine
      .attr("x1", xScale(pointsOnAxes.current.pt1.x) / xSubAxesCount)
      .attr("y1", yScale(pointsOnAxes.current.pt1.y) / ySubAxesCount)
      .attr("x2", xScale(pointsOnAxes.current.pt2.x) / xSubAxesCount)
      .attr("y2", yScale(pointsOnAxes.current.pt2.y) / ySubAxesCount)
  }, [xScale, xSubAxesCount, yScale, ySubAxesCount])

  const toggleConfidenceBandTip = useCallback((event: MouseEvent, show: boolean) => {
    if (show) {
      const dataTipContent = t("DG.ScatterPlotModel.LSRLCIBandInfo")
      const left = event.offsetX - 200 > 0 ? event.offsetX - 220 : 0
      const top = event.offsetY - 50 > 0 ? event.offsetY - 55 : 0
      select(`#${containerId}`).append("div")
        .attr("class", "graph-d3-tip confidence-bands-tip")
        .attr("data-testid", "graph-lsrl-data-tip")
        .html(`<p>${dataTipContent}</p>`)
        .style("left", `${left}px`)
        .style("top", `${top}px`)
    } else {
      select(`#${containerId}`).selectAll(".confidence-bands-tip").remove()
    }
  }, [containerId])

  const handleHighlightLineAndEquation = useCallback((isHighlighted: boolean, lineIndex: number) => {
    const lineObj = lineObjectsRef.current[lineIndex]
    lineObj?.line?.classed("highlight", isHighlighted)
    lineObj?.equation?.selectAll("p").filter(`:nth-child(${lineIndex + 1})`).classed("highlight", isHighlighted)
  }, [])

  const handleMoveEquation = useCallback((
    event: { x: number, y: number, dx: number, dy: number },
    isFinished=false, lineIndex: number
  ) => {
    const lines = getLines()
    // TODO need to get original coordinates on initial show
    const initEquationLeft = lines?.[lineIndex]?.equationCoords?.x ?? 0
    const initEquationTop = lines?.[lineIndex]?.equationCoords?.y ?? 0

    if (event.dx !== 0 || event.dy !== 0 || isFinished) {
      const equation = select(`${equationContainerSelector}`).selectAll("p").filter(`:nth-child(${lineIndex + 1})`)
      const equationLeft = equation.style("left") ? parseFloat(equation.style("left")) : 0
      const equationTop = equation.style("top") ? parseFloat(equation.style("top")) : 0
      const left = equationLeft + event.dx
      const top = equationTop + event.dy
      equation.style("left", `${left}px`)
        .style("top", `${top}px`)

      if (isFinished) {
        graphModel.applyModelChange(
          () => lines?.[lineIndex]?.setEquationCoords({x: left, y: top}),
          {
            undoStringKey: "DG.Undo.graph.repositionEquation",
            redoStringKey: "DG.Redo.graph.repositionEquation",
            log: { message: `Moved equation from (${initEquationLeft}, ${initEquationTop}) to (${left}, ${top})`,
                    args: {initialPosLeft: initEquationLeft, initialPosTop: initEquationTop, newPosLeft: left,
                            newPosTop: top}}
          }
        )
      }
    }
  }, [equationContainerSelector, getLines, graphModel])

  const updateEquations = useCallback(() => {
    const lines = getLines()
    if (!lines) return
    const equationDiv = select(equationContainerSelector)
    equationDiv.style("width", `${plotWidth}px`)
      .style("height", `${plotHeight}px`)
    for (let linesIndex = 0; linesIndex < lines.length; linesIndex++) {
      const category = lines[linesIndex].category
      const caseValues = model.getCaseValues(xAttrId, yAttrId, cellKey, dataConfig, category)
      const color = category && category !== "__main__" ? dataConfig?.getLegendColorForCategory(category) : undefined
      const { slope, intercept, rSquared } = lines[linesIndex]
      if (slope == null || intercept == null) return
      const sumOfSquares = dataConfig && showSumSquares
        ? calculateSumOfSquares({ cellKey, dataConfig, intercept, slope })
        : undefined
      const screenX = xScale((pointsOnAxes.current.pt1.x + pointsOnAxes.current.pt2.x) / 2) / xSubAxesCount
      const screenY = yScale((pointsOnAxes.current.pt1.y + pointsOnAxes.current.pt2.y) / 2) / ySubAxesCount
      const attrNames = {x: xAttrName, y: yAttrName}
      const string = lsrlEquationString({
        attrNames, caseValues, color, intercept, interceptLocked, rSquared,
        showConfidenceBands, slope, sumOfSquares, layout
      })
      const equation = equationDiv.select(`#lsrl-equation-${model.classNameFromKey(cellKey)}-${linesIndex}`)
      equation.html(string)

      // The equation may have been unpinned from its associated line if the user dragged it away from the line.
      // Only move the equation if it is still pinned (i.e. equationCoords is not valid).
      const equationCoords = lines[linesIndex]?.equationCoords
      if (!equationCoords?.isValid()) {
        equation.style("left", `${screenX}px`)
          // If there are multiple lines and equations, we offset the equations slightly
          .style("top", `${screenY + linesIndex * 20}px`)
      } else {
        const left = equationCoords.x
        const top = equationCoords.y
        equation.style("left", `${left}px`)
          .style("top", `${top}px`)
      }
    }
  }, [cellKey, dataConfig, equationContainerSelector, getLines, interceptLocked, layout, model, plotHeight,
      plotWidth, showConfidenceBands, showSumSquares, xAttrId, xAttrName, xScale, xSubAxesCount, yAttrId,
      yAttrName, yScale, ySubAxesCount])

  const confidenceBandPaths = useCallback((caseValues: Point[], lineIndex: number) => {
    const xMin = xScale.domain()[0]
    const xMax = xScale.domain()[1]
    const tPixelMin = xScale(xMin)
    const tPixelMax = xScale(xMax)
    const kPixelGap = 1
    let upperPath = ""
    let lowerPath = ""
    const { upperPoints, lowerPoints } = model.confidenceBandsPoints(
      tPixelMin, tPixelMax, cellCounts.x, cellCounts.y, kPixelGap, caseValues, xScale, yScale, cellKey, lineIndex
    )
    if (upperPoints.length > 0) {
      // Accomplish spline interpolation
      upperPath = `M${upperPoints[0].x}, ${upperPoints[0].y}${curveBasis(upperPoints)}`
      lowerPath = `M${lowerPoints[0].x}, ${lowerPoints[0].y}${curveBasis(lowerPoints)}`
    }
    const combinedPath = `${upperPath}${lowerPath.replace("M", "L")}Z`

    return { upperPath, lowerPath, combinedPath }
  }, [cellCounts, cellKey, model, xScale, yScale])

  const updateConfidenceBands = useCallback((lineIndex: number, line: ILSRLInstance) => {
    if (!dataConfig || !showConfidenceBands) return
    const lineObj = lineObjectsRef.current[lineIndex]

    // If the Intercept Locked option is selected, we do not show confidence bands. So in that case we
    // simply clear the confidence band elements and return.
    if (interceptLocked) {
      lineObj?.confidenceBandCurve?.attr("d", null)
      lineObj?.confidenceBandCover?.attr("d", null)
      lineObj?.confidenceBandShading?.attr("d", null)
      return
    }

    const caseValues = model.getCaseValues(xAttrId, yAttrId, cellKey, dataConfig, line.category)
    const { upperPath, lowerPath, combinedPath } = confidenceBandPaths(caseValues, lineIndex)
    lineObj?.confidenceBandCurve?.attr("d", `${upperPath}${lowerPath}`)
    lineObj?.confidenceBandCover?.attr("d", `${upperPath}${lowerPath}`)
    lineObj?.confidenceBandShading?.attr("d", combinedPath)

    lineObj?.confidenceBandShading?.on("mouseover", (e) => toggleConfidenceBandTip(e, true))
      .on("mouseout", (e) => toggleConfidenceBandTip(e, false))
  }, [cellKey, confidenceBandPaths, dataConfig, interceptLocked, model, showConfidenceBands, toggleConfidenceBandTip,
      xAttrId, yAttrId])

  const updateLines = useCallback(() => {
    const lines = getLines()
    if (!lines) return

    for (let lineIndex = 0; lineIndex < lineObjectsRef.current.length; lineIndex++) {
      const lineObj = lineObjectsRef.current[lineIndex]
      const line = lines[lineIndex]
      const { slope, intercept } = line
      const { xDomain, yDomain } = getAxisDomains(xAxis, yAxis)
      if (!slope || !intercept) continue
      pointsOnAxes.current = lineToAxisIntercepts(slope, intercept, xDomain, yDomain)

      lineObj.line && fixEndPoints(lineObj.line)
      lineObj.cover && fixEndPoints(lineObj.cover)
      updateConfidenceBands(lineIndex, line)
    }
  }, [fixEndPoints, getLines, updateConfidenceBands, xAxis, yAxis])

  const updateLSRL = useCallback(() => {
    updateLines()
    updateEquations()
  }, [updateEquations, updateLines])

  const buildElements = useCallback(() => {
    const lines = getLines()
    if (!lines) return

    // Clear any previously added elements
    const selection = select(lineRef.current)
    selection.html(null)
    select(`#${containerId}`).selectAll("div").remove()
    lineObjectsRef.current = []

    // Add a container for the equation boxes that will accompany each line
    const equationDiv = select(`#${containerId}`).append("div")
      .attr("class", `lsrl-equation-container ${equationContainerClass}`)
      .attr("data-testid", `${equationContainerClass}`)
      .style("width", `${plotWidth}px`)
      .style("height", `${plotHeight}px`)

    // Add a line for each item in the model's lines array
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const lineObj: ILineObject = {}
      const lineCategory = lines[lineIndex].category
      const catColor = lineCategory && lineCategory !== "__main__"
        ? dataConfig?.getLegendColorForCategory(lineCategory)
        : undefined
      const { slope, intercept } = lines[lineIndex]
      const { xDomain, yDomain } = getAxisDomains(xAxis, yAxis)
      if (slope == null || intercept == null) continue
      pointsOnAxes.current = lineToAxisIntercepts(slope, intercept, xDomain, yDomain)

      // Set up the confidence band elements. We add them before the line so they don't interfere
      // with the line's mouseover behavior.
      lineObj.confidenceBandCurve = selection.append("path")
        .attr("class", `lsrl-confidence-band lsrl-confidence-band-${classFromKey}`)
        .attr("data-testid", `lsrl-confidence-band${classFromKey ? `-${classFromKey}` : ""}`)
      lineObj.confidenceBandCover = selection.append("path")
        .attr("class", `lsrl-confidence-band-cover lsrl-confidence-band-cover-${classFromKey}`)
        .attr("data-testid", `lsrl-confidence-band-cover${classFromKey ? `-${classFromKey}` : ""}`)
      lineObj.confidenceBandShading = selection.append("path")
        .attr("class", `lsrl-confidence-band-shading lsrl-confidence-band-shading-${classFromKey}`)
        .attr("data-testid", `lsrl-confidence-band-shading${classFromKey ? `-${classFromKey}` : ""}`)

      // Set up the line and its cover element
      lineObj.line = selection.append("line")
        .attr("class", `lsrl lsrl-${classFromKey}`)
        .attr("data-testid", `lsrl${classFromKey ? `-${classFromKey}` : ""}`)
      lineObj.cover = selection.append("line")
        .attr("class", `lsrl-cover lsrl-cover-${classFromKey}`)
        .attr("data-testid", `lsrl-cover${classFromKey ? `-${classFromKey}` : ""}`)
      lineObj.cover.on("mouseover", () => { handleHighlightLineAndEquation(true, lineIndex) })
        .on("mouseout", () => { handleHighlightLineAndEquation(false, lineIndex) })

      // Set the line's coordinates
      fixEndPoints(lineObj?.line)
      fixEndPoints(lineObj?.cover)

      // If there is a categorical legend, use the associated category's color for the line and its confidence bands
      catColor && lineObj?.line?.style("stroke", catColor)
      catColor && lineObj?.confidenceBandCurve?.style("stroke", catColor)
      catColor && lineObj?.confidenceBandShading?.style("fill", catColor)

      // Add the equation box for the line to the equation container
      const equationP = equationDiv
        .append("p")
        .attr("class", "lsrl-equation")
        .attr("id", `lsrl-equation-${model.classNameFromKey(cellKey)}-${lineIndex}`)
        .attr("data-testid", `lsrl-equation-${model.classNameFromKey(cellKey)}`)
        .on("mouseover", () => { handleHighlightLineAndEquation(true, lineIndex) })
        .on("mouseout", () => { handleHighlightLineAndEquation(false, lineIndex) })

      // If the equation is not pinned to the line, set its initial coordinates to the values specified in the model.
      const equationCoords = lines[lineIndex]?.equationCoords
      if (equationCoords?.isValid()) {
        const left = equationCoords.x * 100
        const top = equationCoords.y * 100
        equationP.style("left", `${left}%`)
          .style("top", `${top}%`)
      }

      lineObj.equation = equationDiv
      lineObjectsRef.current = [...lineObjectsRef.current, lineObj]
      updateEquations()
      showConfidenceBands && updateConfidenceBands(lineIndex, lines[lineIndex])

      const equation = equationDiv.select<HTMLElement>(`#lsrl-equation-${model.classNameFromKey(cellKey)}-${lineIndex}`)
      equation?.call(
        drag<HTMLElement, unknown>().on("drag", (e) => handleMoveEquation(e, false, lineIndex))
          .on("end", (e) => handleMoveEquation(e, true, lineIndex))
      )
    }

  }, [cellKey, classFromKey, containerId, dataConfig, equationContainerClass, fixEndPoints, getLines,
      handleHighlightLineAndEquation, handleMoveEquation, model, plotHeight, plotWidth, showConfidenceBands,
      updateConfidenceBands, updateEquations, xAxis, yAxis])

  // Refresh values on interceptLocked change
  useEffect(function refreshInterceptLockChange() {
    const updateCategoryOptions = graphModel.getUpdateCategoriesOptions()
    return mstReaction(
      () => {
        model.updateCategories(updateCategoryOptions)
      },
      () => {
        buildElements()
      }, { name: "LSRLAdornmentComponent.refreshInterceptLockChange" }, model)
  }, [buildElements, dataConfig, graphModel, interceptLocked, model, updateLSRL, xAxis, yAxis])

  // Refresh values on changes to axes
  useEffect(function refreshAxisChange() {
    return mstAutorun(
      () => {
        getAxisDomains()
        graphModel.getUpdateCategoriesOptions()
        buildElements()
      }, { name: "LSRLAdornmentComponent.refreshAxisChange" }, model)
  }, [buildElements, graphModel, model, xAxis, yAxis])

  return (
    <svg
      className={`lsrl-${model.classNameFromKey(cellKey)}`}
      style={{height: "100%", width: "100%"}}
      x={0}
      y={0}
    >
      <g>
        <g ref={lineRef}/>
      </g>
    </svg>
  )
})
