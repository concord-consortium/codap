import React, { useCallback, useEffect, useRef } from "react"
import { observer } from "mobx-react-lite"
import { drag, select, Selection } from "d3"
import t from "../../../../utilities/translation/translate"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { useAxisLayoutContext } from "../../../axis/models/axis-layout-context"
import { ScaleNumericBaseType } from "../../../axis/axis-types"
import { Point } from "../../../data-display/data-display-types"
import { INumericAxisModel } from "../../../axis/models/axis-model"
import { IAxisIntercepts, curveBasis, lineToAxisIntercepts, lsrlEquationString } from "../../utilities/graph-utils"
import { ILSRLAdornmentModel, ILSRLInstance } from "./lsrl-adornment-model"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { useGraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"

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

interface IProps {
  containerId: string
  model: ILSRLAdornmentModel
  plotHeight: number
  plotWidth: number
  cellKey: Record<string, string>
  xAxis: INumericAxisModel
  yAxis: INumericAxisModel
}

export const LSRLAdornment = observer(function LSRLAdornment(props: IProps) {
  const {containerId, model, plotHeight, plotWidth, cellKey={}, xAxis, yAxis} = props
  const graphModel = useGraphContentModelContext()
  const dataConfig = useGraphDataConfigurationContext()
  const layout = useAxisLayoutContext()
  const xScale = layout.getAxisScale("bottom") as ScaleNumericBaseType
  const yScale = layout.getAxisScale("left") as ScaleNumericBaseType
  const xAttrType = dataConfig?.attributeType("x")
  const yAttrType = dataConfig?.attributeType("y")
  const xSubAxesCount = layout.getAxisMultiScale("bottom")?.repetitions ?? 1
  const ySubAxesCount = layout.getAxisMultiScale("left")?.repetitions ?? 1
  const xCatSet = layout.getAxisMultiScale("bottom")?.categorySet
  const xCats = xAttrType === "categorical" && xCatSet ? Array.from(xCatSet.values) : [""]
  const yCatSet = layout.getAxisMultiScale("left")?.categorySet
  const yCats = yAttrType === "categorical" && yCatSet ? Array.from(yCatSet.values) : [""]
  const xCellCount = xCats.length * xSubAxesCount
  const yCellCount = yCats.length * ySubAxesCount
  const allAttributes = dataConfig?.dataset?.attributes
  const xAttrId = dataConfig?.attributeID("x") || ""
  const yAttrId = dataConfig?.attributeID("y") || ""
  const xAttr = allAttributes?.find(attr => attr.id === xAttrId)
  const yAttr = allAttributes?.find(attr => attr.id === yAttrId)
  const xAttrName = xAttr?.name ?? ""
  const yAttrName = yAttr?.name ?? ""
  const instanceKey = model.instanceKey(cellKey)
  const classFromKey = model.classNameFromKey(cellKey)
  const showConfidenceBands = model.showConfidenceBands
  const { equationContainerClass, equationContainerSelector } = equationContainer(model, cellKey, containerId)
  const lineRef = useRef() as React.RefObject<SVGSVGElement>
  const lineObjectsRef = useRef<ILineObject[]>([])
  const pointsOnAxes = useRef<IAxisIntercepts>({pt1: {x: 0, y: 0}, pt2: {x: 0, y: 0}})

  const getLines = useCallback(() => {
    return dataConfig && model.getLines(xAttrId, yAttrId, cellKey, dataConfig)
  }, [cellKey, dataConfig, model, xAttrId, yAttrId])

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
    event: { x: number, y: number, dx: number, dy: number }, isFinished=false, lineIndex: number
  ) => {
    if (event.dx !== 0 || event.dy !== 0 || isFinished) {
      const equation = select(`${equationContainerSelector}`).selectAll("p").filter(`:nth-child(${lineIndex + 1})`)
      const equationNode = equation.node() as Element
      const equationWidth = equationNode?.getBoundingClientRect().width || 0
      const equationHeight = equationNode?.getBoundingClientRect().height || 0
      const left = event.x - equationWidth / 2
      const top = event.y - equationHeight / 2
      equation.style("left", `${left}px`)
        .style("top", `${top}px`)

      if (isFinished) {
        const lines = getLines()
        if (!lines) return
        // Get the percentage of plot width and height of the equation box's coordinates
        // for a more accurate placement of the equation box.
        const x = left / plotWidth
        const y = top / plotHeight
        graphModel.applyUndoableAction(
          () => lines[lineIndex]?.setEquationCoords({x, y}),
          "DG.Undo.graph.repositionEquation", "DG.Redo.graph.repositionEquation"
        )
      }
    }
  }, [equationContainerSelector, getLines, graphModel, plotHeight, plotWidth])

  const updateEquations = useCallback(() => {
    const lines = getLines()
    if (!lines) return
    const equationDiv = select(equationContainerSelector)
    equationDiv.style("width", `${plotWidth}px`)
      .style("height", `${plotHeight}px`)
    for (let linesIndex = 0; linesIndex < lines.length; linesIndex++) {
      const category = lines[linesIndex].category
      const caseValues = model.getCaseValues(xAttrId, yAttrId, cellKey, dataConfig, category)
      const catColor = category && category !== "__main__" ? dataConfig?.getLegendColorForCategory(category) : undefined
      const { slope, intercept, rSquared } = lines[linesIndex]
      if (!slope || !intercept || !rSquared) continue
      const screenX = xScale((pointsOnAxes.current.pt1.x + pointsOnAxes.current.pt2.x) / 2) / xSubAxesCount
      const screenY = yScale((pointsOnAxes.current.pt1.y + pointsOnAxes.current.pt2.y) / 2) / ySubAxesCount
      const attrNames = {x: xAttrName, y: yAttrName}
      const string =
        lsrlEquationString(slope, intercept, rSquared, attrNames, caseValues, showConfidenceBands, catColor)
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
        const left = equationCoords.x * 100
        const top = equationCoords.y * 100
        equation.style("left", `${left}%`)
          .style("top", `${top}%`)
      }
    }
  }, [cellKey, dataConfig, equationContainerSelector, getLines, model, plotHeight, plotWidth, showConfidenceBands,
      xAttrId, xAttrName, xScale, xSubAxesCount, yAttrId, yAttrName, yScale, ySubAxesCount])

  const confidenceBandPaths = useCallback((caseValues: Point[], lineIndex: number) => {
    const xMin = xScale.domain()[0]
    const xMax = xScale.domain()[1]
    const tPixelMin = xScale(xMin)
    const tPixelMax = xScale(xMax)
    const kPixelGap = 1
    let upperPath = ""
    let lowerPath = ""
    const { upperPoints, lowerPoints } = model.confidenceBandsPoints(
      tPixelMin, tPixelMax, xCellCount, yCellCount, kPixelGap, caseValues, xScale, yScale, cellKey, lineIndex
    )
    if (upperPoints.length > 0) {
      // Accomplish spline interpolation
      upperPath = `M${upperPoints[0].x}, ${upperPoints[0].y}${curveBasis(upperPoints)}`
      lowerPath = `M${lowerPoints[0].x}, ${lowerPoints[0].y}${curveBasis(lowerPoints)}`
    }
    const combinedPath = `${upperPath}${lowerPath.replace("M", "L")}Z`

    return { upperPath, lowerPath, combinedPath }
  }, [cellKey, model, xCellCount, xScale, yCellCount, yScale])

  const updateConfidenceBands = useCallback((lineIndex: number, line: ILSRLInstance) => {
    if (!dataConfig || !showConfidenceBands) return
    const lineObj = lineObjectsRef.current[lineIndex]
    const caseValues = model.getCaseValues(xAttrId, yAttrId, cellKey, dataConfig, line.category)
    const { upperPath, lowerPath, combinedPath } = confidenceBandPaths(caseValues, lineIndex)
    lineObj?.confidenceBandCurve?.attr("d", `${upperPath}${lowerPath}`)
    lineObj?.confidenceBandCover?.attr("d", `${upperPath}${lowerPath}`)
    lineObj?.confidenceBandShading?.attr("d", combinedPath)
    lineObj?.confidenceBandCurve?.attr("d", `${upperPath}${lowerPath}`)
    lineObj?.confidenceBandCover?.attr("d", `${upperPath}${lowerPath}`)
    lineObj?.confidenceBandShading?.attr("d", combinedPath)

    lineObj?.confidenceBandShading?.on("mouseover", (e) => toggleConfidenceBandTip(e, true))
      .on("mouseout", (e) => toggleConfidenceBandTip(e, false))
  }, [cellKey, confidenceBandPaths, dataConfig, model, showConfidenceBands, toggleConfidenceBandTip, xAttrId, yAttrId])

  const updateLines = useCallback(() => {
    const lines = getLines()
    if (!lines) return

    for (let lineIndex = 0; lineIndex < lineObjectsRef.current.length; lineIndex++) {
      const lineObj = lineObjectsRef.current[lineIndex]
      const line = lines[lineIndex]
      const { slope, intercept } = line
      const { domain: xDomain } = xAxis
      const { domain: yDomain } = yAxis
      if (!slope || !intercept) continue
      pointsOnAxes.current = lineToAxisIntercepts(slope, intercept, xDomain, yDomain)

      lineObj.line && fixEndPoints(lineObj.line)
      lineObj.cover && fixEndPoints(lineObj.cover)
      updateConfidenceBands(lineIndex, line)
    }
  }, [getLines, xAxis, yAxis, fixEndPoints, updateConfidenceBands])

  const updateLSRL = useCallback(() => {
    updateLines()
    updateEquations()
  }, [updateEquations, updateLines])

  useEffect(function createElements() {
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
      const { domain: xDomain } = xAxis
      const { domain: yDomain } = yAxis
      if (!slope || !intercept) continue
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

      const equation = equationDiv.select<HTMLElement>(`#lsrl-equation-${model.classNameFromKey(cellKey)}-${lineIndex}`)
      equation?.call(
        drag<HTMLElement, unknown>().on("drag", (e) => handleMoveEquation(e, false, lineIndex))
          .on("end", (e) => handleMoveEquation(e, true, lineIndex))
      )
    }

  }, [cellKey, classFromKey, confidenceBandPaths, containerId, dataConfig, equationContainerClass, fixEndPoints,
      getLines, handleHighlightLineAndEquation, handleMoveEquation, instanceKey, model, plotHeight, plotWidth,
      showConfidenceBands, xAxis, xCellCount, xScale, xSubAxesCount, yAxis, yCellCount, yScale, ySubAxesCount])

  // Refresh values on axis changes
  useEffect(function refreshAxisChange() {
    return mstAutorun(() => {
      // We observe changes to the axis domains within the autorun by extracting them from the axes below.
      // We do this instead of including domains in the useEffect dependency array to prevent domain changes
      // from triggering a reinstall of the autorun.
      const { domain: xDomain } = xAxis // eslint-disable-line @typescript-eslint/no-unused-vars
      const { domain: yDomain } = yAxis // eslint-disable-line @typescript-eslint/no-unused-vars
      updateLSRL()
    }, { name: "LSRLAdornmentComponent.refreshAxisChange" }, model)
  }, [dataConfig, model, xAxis, yAxis, updateLSRL])

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
