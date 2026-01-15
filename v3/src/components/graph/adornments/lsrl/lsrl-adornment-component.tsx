import { drag, select, Selection } from "d3"
import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useRef } from "react"
import { LogMessageFn, logModelChangeFn } from "../../../../lib/log-message"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { mstReaction } from "../../../../utilities/mst-reaction"
import { safeGetSnapshot } from "../../../../utilities/mst-utils"
import { t } from "../../../../utilities/translation/translate"
import { kMain } from "../../../data-display/data-display-types"
import { useAdornmentAttributes } from "../../hooks/use-adornment-attributes"
import { useAdornmentCategories } from "../../hooks/use-adornment-categories"
import { useAdornmentCells } from "../../hooks/use-adornment-cells"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { useGraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"
import { useGraphLayoutContext } from "../../hooks/use-graph-layout-context"
import {
  IAxisIntercepts, calculateSumOfSquares, curveBasis, lineToAxisIntercepts, lsrlEquationString
} from "../../utilities/graph-utils"
import { IAdornmentComponentProps } from "../adornment-component-info"
import { Point } from "../point-model"
import { getAxisDomains } from "../utilities/adornment-utils"
import { ILSRLAdornmentModel, ILSRLInstance } from "./lsrl-adornment-model"

import "./lsrl-adornment-component.scss"

function equationContainerDefs(model: ILSRLAdornmentModel, cellKey: Record<string, string>, containerId: string) {
  const classFromKey = model.classNameFromKey(cellKey)
  const equationContainerClass = `lsrl-equation-container-${classFromKey}`
  const equationContainerSelector = `#${containerId} .${equationContainerClass}`
  return { equationContainerClass, equationContainerSelector }
}

interface ILineObject {
  category: string
  index: number
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
  const { equationContainerClass, equationContainerSelector } = equationContainerDefs(model, cellKey, containerId)
  const lineRef = useRef() as React.RefObject<SVGSVGElement>
  const lineObjectsRef = useRef(new Map<string, ILineObject>())
  const pointsOnAxes = useRef<IAxisIntercepts>({pt1: {x: 0, y: 0}, pt2: {x: 0, y: 0}})
  const logFn = useRef<Maybe<LogMessageFn>>()

  const getLines = useCallback(() => {
    return dataConfig && model.getLines(xAttrId, yAttrId, cellKey, dataConfig, adornmentsStore?.interceptLocked)
  }, [cellKey, dataConfig, adornmentsStore, model, xAttrId, yAttrId])

  const fixEndPoints = useCallback((iLine: Selection<SVGLineElement, unknown, null, undefined>) => {
    if (
      !Number.isFinite(pointsOnAxes.current.pt1.x) || !Number.isFinite(pointsOnAxes.current.pt2.x) ||
      !Number.isFinite(pointsOnAxes.current.pt1.y) || !Number.isFinite(pointsOnAxes.current.pt2.y) ||
      xScale.range().length === 0 || yScale.range().length === 0
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

  const handleHighlightLineAndEquation = useCallback((isHighlighted: boolean, category = kMain) => {
    const lineObj = lineObjectsRef.current.get(category)
    const lineIndex = lineObj?.index ?? 0
    lineObj?.line?.classed("highlight", isHighlighted)
    lineObj?.equation?.selectAll("p").filter(`:nth-child(${lineIndex + 1})`).classed("highlight", isHighlighted)
  }, [])

  const handleMoveEquation = useCallback((
    event: { x: number, y: number, dx: number, dy: number },
    isFinished = false, category = kMain
  ) => {
    if (event.dx !== 0 || event.dy !== 0 || isFinished) {
      const lineObj = lineObjectsRef.current.get(category)
      const lineIndex = lineObj?.index ?? 0
      const equationContainer = select<HTMLDivElement, unknown>(equationContainerSelector)
      const equation = equationContainer
                        .selectAll<HTMLParagraphElement, unknown>("p")
                        .filter(`:nth-child(${lineIndex + 1})`)
      const equationBounds = equation.node()?.getBoundingClientRect()
      const equationLeft = equation.style("left") ? parseFloat(equation.style("left")) : 0
      const equationTop = equation.style("top") ? parseFloat(equation.style("top")) : 0
      if (equationBounds && equationLeft && equationTop) {
        const left = equationLeft + event.dx
        const top = equationTop + event.dy
        equation.style("left", `${left}px`)
          .style("top", `${top}px`)

        const containerBounds = equationContainer.node()?.getBoundingClientRect()
        if (containerBounds && isFinished) {
          // compute proportional position of center of label within container
          const x = (left + equationBounds.width / 2) / containerBounds.width
          const y = (top + equationBounds.height / 2) / containerBounds.height
          graphModel.applyModelChange(
            () => model.setLabelEquationCoords(cellKey, category, { x, y}),
            {
              undoStringKey: "DG.Undo.graph.repositionEquation",
              redoStringKey: "DG.Redo.graph.repositionEquation",
              log: logFn.current
            }
          )
        }
      }
    }
  }, [cellKey, equationContainerSelector, graphModel, model])

  const updateEquations = useCallback(() => {
    const lines = getLines()
    if (!lines) return
    const key = JSON.stringify(cellKey)
    const xUnits = dataConfig?.dataset?.getAttribute(xAttrId)?.units
    const yUnits = dataConfig?.dataset?.getAttribute(yAttrId)?.units
    const equationDiv = select<HTMLDivElement, unknown>(equationContainerSelector)
    const interceptLocked = adornmentsStore?.interceptLocked
    equationDiv.style("width", `${plotWidth}px`)
      .style("height", `${plotHeight}px`)
    let linesIndex = 0
    lines.forEach((line, _category) => {
      const category = String(_category)
      const label = model.labels.get(key)?.get(category)
      const caseValues = model.getCaseValues(xAttrId, yAttrId, cellKey, dataConfig, category)
      const color = category && category !== kMain ? dataConfig?.getLegendColorForCategory(category) : undefined
      const { slope, intercept, rSquared,
              seSlope, seIntercept } = line
      if (slope == null || intercept == null) return
      const sumOfSquares = dataConfig && showSumSquares
        ? calculateSumOfSquares({ cellKey, dataConfig, computeY: (x) => intercept + slope * x })
        : undefined
      const screenX = xScale((pointsOnAxes.current.pt1.x + pointsOnAxes.current.pt2.x) / 2) / xSubAxesCount
      const screenY = yScale((pointsOnAxes.current.pt1.y + pointsOnAxes.current.pt2.y) / 2) / ySubAxesCount
      const attrNames = {x: xAttrName, y: yAttrName}
      const units = {x: xUnits, y: yUnits}
      const string = lsrlEquationString({
        attrNames, units, caseValues, intercept, interceptLocked, rSquared,
        showConfidenceBands, slope, sumOfSquares, seSlope, seIntercept, layout
      })
      const equationSelector = `#lsrl-equation-${model.classNameFromKey(cellKey)}-${linesIndex}`
      const equation = equationDiv.select<HTMLDivElement>(equationSelector)
      if (color) equation.style("color", color)
      equation.html(string)

      const equationBounds = equation.node()?.getBoundingClientRect()
      // rendered extents are used for rendering and for exporting in v2 format
      label?.setExtents({
        labelWidth: equationBounds?.width,
        labelHeight: equationBounds?.height,
        plotWidth,
        plotHeight
      })

      // The equation may have been unpinned from its associated line if the user dragged it away from the line.
      // Only move the equation if it is still pinned (i.e. equationCoords is not valid).
      const labelPos = label?.labelPosition
      if (!labelPos) {
        equation.style("left", `${screenX}px`)
          // If there are multiple lines and equations, we offset the equations slightly
          .style("top", `${screenY + linesIndex * 20}px`)
      } else {
        equation.style("left", `${labelPos.left}px`)
          .style("top", `${labelPos.top}px`)
      }
      ++linesIndex
    })
  }, [getLines, cellKey, dataConfig, xAttrId, yAttrId, equationContainerSelector,
    adornmentsStore?.interceptLocked, plotWidth, plotHeight, model, showSumSquares,
    xScale, xSubAxesCount, yScale, ySubAxesCount, xAttrName, yAttrName, showConfidenceBands, layout])

  const confidenceBandPaths = useCallback((caseValues: Point[], category = kMain) => {
    const xMin = xScale.domain()[0]
    const xMax = xScale.domain()[1]
    const tPixelMin = xScale(xMin)
    const tPixelMax = xScale(xMax)
    const kPixelGap = 1
    let upperPath = ""
    let lowerPath = ""
    const { upperPoints, lowerPoints } = model.confidenceBandsPoints(
      tPixelMin, tPixelMax, cellCounts.x, cellCounts.y, kPixelGap, caseValues, xScale, yScale, cellKey, category
    )
    if (upperPoints.length > 0) {
      // Accomplish spline interpolation
      upperPath = `M${upperPoints[0].x}, ${upperPoints[0].y}${curveBasis(upperPoints)}`
      lowerPath = `M${lowerPoints[0].x}, ${lowerPoints[0].y}${curveBasis(lowerPoints)}`
    }
    const combinedPath = `${upperPath}${lowerPath.replace("M", "L")}Z`

    return { upperPath, lowerPath, combinedPath }
  }, [cellCounts, cellKey, model, xScale, yScale])

  const updateConfidenceBands = useCallback((line: ILSRLInstance, category = kMain) => {
    if (!dataConfig || !showConfidenceBands) return
    const lineObj = lineObjectsRef.current.get(category)

    // If the Intercept Locked option is selected, we do not show confidence bands. So in that case we
    // simply clear the confidence band elements and return.
    if (adornmentsStore?.interceptLocked) {
      lineObj?.confidenceBandCurve?.attr("d", null)
      lineObj?.confidenceBandCover?.attr("d", null)
      lineObj?.confidenceBandShading?.attr("d", null)
      return
    }

    const caseValues = model.getCaseValues(xAttrId, yAttrId, cellKey, dataConfig, line.category)
    const { upperPath, lowerPath, combinedPath } = confidenceBandPaths(caseValues, line.category)
    lineObj?.confidenceBandCurve?.attr("d", `${upperPath}${lowerPath}`)
      .style("stroke-dasharray", "4,3")
    lineObj?.confidenceBandCover?.attr("d", `${upperPath}${lowerPath}`)
    lineObj?.confidenceBandShading?.attr("d", combinedPath)

    lineObj?.confidenceBandShading?.on("mouseover", (e) => toggleConfidenceBandTip(e, true))
      .on("mouseout", (e) => toggleConfidenceBandTip(e, false))
  }, [cellKey, confidenceBandPaths, dataConfig, adornmentsStore, model, showConfidenceBands,
            toggleConfidenceBandTip, xAttrId, yAttrId])

  const updateLines = useCallback(() => {
    const lines = getLines()
    if (!lines) return

    lines.forEach((line, _category) => {
      const category = String(_category)
      const lineObj = lineObjectsRef.current.get(category)
      const { slope, intercept } = line
      const { xDomain, yDomain } = getAxisDomains(xAxis, yAxis)
      if (lineObj != null && slope != null && intercept != null) {
        pointsOnAxes.current = lineToAxisIntercepts(slope, intercept, xDomain, yDomain)

        lineObj.line && fixEndPoints(lineObj.line)
        lineObj.cover && fixEndPoints(lineObj.cover)
        updateConfidenceBands(line)
      }
    })
  }, [fixEndPoints, getLines, updateConfidenceBands, xAxis, yAxis])

  const updateLSRL = useCallback(() => {
    updateLines()
    updateEquations()
  }, [updateEquations, updateLines])

  const buildElements = useCallback(() => {
    const lines = getLines()
    if (!lines) return
    const key = JSON.stringify(cellKey)

    // Clear any previously added elements
    const selection = select(lineRef.current)
    selection.html(null)
    select(`#${containerId}`).selectAll("div").remove()
    lineObjectsRef.current = new Map()

    // Add a container for the equation boxes that will accompany each line
    const equationDiv = select(`#${containerId}`).append("div")
      .attr("class", `lsrl-equation-container ${equationContainerClass}`)
      .attr("data-testid", `${equationContainerClass}`)
      .style("width", `${plotWidth}px`)
      .style("height", `${plotHeight}px`)

    // Add a line for each item in the model's lines array
    lines.forEach((line, _category) => {
      const category = String(_category)
      const label = model.labels.get(key)?.get(category)
      label?.setExtents({ plotWidth, plotHeight })
      const lineIndex = lineObjectsRef.current.size
      const lineCategory = String(_category)
      const lineObj: ILineObject = { category: lineCategory, index: lineIndex }
      const catColor = lineCategory && lineCategory !== kMain
        ? dataConfig?.getLegendColorForCategory(lineCategory)
        : undefined
      const { slope, intercept } = line
      const { xDomain, yDomain } = getAxisDomains(xAxis, yAxis)
      if (slope != null && intercept != null) {
        pointsOnAxes.current = lineToAxisIntercepts(slope, intercept, xDomain, yDomain)

        // Set up the confidence band elements. We add them before the line, so they don't interfere
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
        lineObj.cover.on("mouseover", () => { handleHighlightLineAndEquation(true, lineCategory) })
          .on("mouseout", () => { handleHighlightLineAndEquation(false, lineCategory) })

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
          .on("mouseover", () => { handleHighlightLineAndEquation(true, lineCategory) })
          .on("mouseout", () => { handleHighlightLineAndEquation(false, lineCategory) })

        // If the equation is not pinned to the line, set its initial coordinates to the values specified in the model.
        const labelPos = label?.labelPosition
        if (labelPos) {
          equationP
            .style("left", `${labelPos.left}px`)
            .style("top", `${labelPos.top}px`)
        }

        lineObj.equation = equationDiv
        lineObjectsRef.current.set(lineCategory, lineObj)
        updateEquations()
        showConfidenceBands && updateConfidenceBands(line, lineCategory)

        const equationDivSelector = `#lsrl-equation-${model.classNameFromKey(cellKey)}-${lineIndex}`
        const equation = equationDiv.select<HTMLElement>(equationDivSelector)
        equation?.call(
          drag<HTMLElement, unknown>()
            .on("start", (e) => {
              logFn.current = logModelChangeFn(
                                "Moved equation from (%@, %@) to (%@, %@)",
                                () => safeGetSnapshot(label?.equationCoords) ?? { x: "default", y: "default" })
            })
            .on("drag", (e) => handleMoveEquation(e, false, lineCategory))
            .on("end", (e) => handleMoveEquation(e, true, lineCategory))
        )
      }
    })

    // TODO: this effect seems to run continuously. The corresponding effect in MovableLineAdornmentComponent
    // only runs once when the component mounts. Should we do the same here?
  }, [cellKey, classFromKey, containerId, dataConfig, equationContainerClass, fixEndPoints, getLines,
      handleHighlightLineAndEquation, handleMoveEquation, model, plotHeight, plotWidth, showConfidenceBands,
      updateConfidenceBands, updateEquations, xAxis, yAxis])

  // Refresh values on changes to model's computed values
  useEffect(function refreshInterceptLockChange() {
    return mstReaction(
      () => model.changeCount,
      () => {
        buildElements()
      }, { name: "LSRLAdornmentComponent.refreshInterceptLockChange" }, model)
  }, [buildElements, model, model.changeCount])

  // Refresh values on interceptLocked change
  useEffect(function refreshInterceptLockChange() {
    return mstReaction(
      () => adornmentsStore?.interceptLocked,
      () => {
        model.updateCategories(graphModel.getUpdateCategoriesOptions())
        buildElements()
      }, { name: "LSRLAdornmentComponent.refreshInterceptLockChange" }, model)
  }, [buildElements, dataConfig, graphModel, adornmentsStore, model, updateLSRL, xAxis, yAxis])

  // Refresh values on interceptLocked change
  useEffect(function refreshShowConfidenceBandsChange() {
    return mstReaction(
      () => model.showConfidenceBands,
      () => {
        model.updateCategories(graphModel.getUpdateCategoriesOptions())
        buildElements()
      }, { name: "LSRLAdornmentComponent.refreshInterceptLockChange" }, model)
  }, [buildElements, dataConfig, graphModel, adornmentsStore, model, updateLSRL, xAxis, yAxis])

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
