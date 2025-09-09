import React, { useCallback, useEffect, useMemo, useRef } from "react"
import { drag, select, Selection } from "d3"
import { observer } from "mobx-react-lite"
import { clsx } from "clsx"
import { t } from "../../../../../utilities/translation/translate"
import { measureText } from "../../../../../hooks/use-measure-text"
import { IAdornmentComponentProps } from "../../adornment-component-info"
import { UnivariateMeasureAdornmentHelper } from "../univariate-measure-adornment-helper"
import { useAdornmentAttributes } from "../../../hooks/use-adornment-attributes"
import { useAdornmentCells } from "../../../hooks/use-adornment-cells"
import { ILabel } from "../univariate-measure-adornment-types"
import { IStandardErrorAdornmentModel } from "./standard-error-adornment-model"
import { IMeasureInstance } from "../univariate-measure-adornment-model"
import { UnivariateMeasureAdornmentBaseComponent } from "../univariate-measure-adornment-base-component"

interface IStandardErrorSelections {
  errorBar?: Selection<SVGPathElement, unknown, null, undefined>
  errorBarHoverCover?: Selection<SVGPathElement, unknown, null, undefined>
  errorBarFullHeightLines?: Selection<SVGPathElement, unknown, null, undefined>
  text?: Selection<SVGTextElement, unknown, null, undefined>
  divText?: Selection<HTMLDivElement, unknown, HTMLElement, undefined>
}

const kErrorBarPathClass = "standard-error-path",
  kFullHighLinesClass = "full-height-lines",
  kBarCoord = 12  // Pixels from top or right edge of the plot

export const StandardErrorAdornmentComponent = observer(
  function StandardErrorAdornmentComponent(props: IAdornmentComponentProps) {
    const {cellKey = {}, cellCoords, containerId, plotWidth, xAxis, yAxis, spannerRef} = props
    const model = props.model as IStandardErrorAdornmentModel
    const {
      dataConfig, layout, adornmentsStore,
      numericAttrId, showLabel, isVerticalRef, valueRef,
      labelRef, defaultLabelTopOffset } = useAdornmentAttributes()
    const helper = useMemo(() => {
      return new UnivariateMeasureAdornmentHelper(cellKey, isVerticalRef, layout, model, containerId)
    }, [cellKey, containerId, isVerticalRef, layout, model])
    const {cellCounts} = useAdornmentCells(model, cellKey)
    const isBlockingOtherMeasure = dataConfig &&
      helper.blocksOtherMeasure({adornmentsStore, attrId: numericAttrId, dataConfig})
    const valueObjRef = useRef<IStandardErrorSelections>({})
    const range = dataConfig
      ? model.computeMeasureRange(numericAttrId, cellKey, dataConfig) : {min: NaN, max: NaN}
    const rangeValue = range.max - range.min

    const highlightCovers = useCallback((highlight: boolean) => {
      const cover = valueObjRef.current.errorBarHoverCover,
        coverClassName = `standard-error-hover-cover${highlight ? ' highlighted' : ''}`,
        fullHeightLines = valueObjRef.current.errorBarFullHeightLines,
        fullHeightLinesClass = `${kFullHighLinesClass} ${highlight ? 'highlighted' : ''}`
      cover?.attr("class", coverClassName)
      fullHeightLines?.attr("class", fullHeightLinesClass)
    }, [])

    const highlightLabel = useCallback((labelId: string, highlight: boolean) => {
      const label = select(`#${labelId}`)
      label.classed("highlighted", highlight)
      highlightCovers(highlight)
    }, [highlightCovers])

    const toggleTextTip = useCallback((tip:  Selection<SVGTextElement, unknown, null, undefined> | undefined,
                                       visible: boolean) => {
      tip?.classed("visible", visible)
      highlightCovers(visible)
      if (isBlockingOtherMeasure) {
        const containerNode: Element = select(`#${containerId}`).node() as Element
        const parentContainer = containerNode.parentNode as Element
        const blockedMeasureTips = select(parentContainer).selectAll(`.show-on-overlap-hover`).filter((d, i, nodes) => {
          return (nodes[i] as SVGTextElement).id !== tip?.attr("id")
        })
        blockedMeasureTips.classed("visible offset", visible)
      }
    }, [containerId, highlightCovers, isBlockingOtherMeasure])

    const addLabels = useCallback((
      labelObj: ILabel, measure: IMeasureInstance, textContent: string, selectionsObj: IStandardErrorSelections,
      plotValue: number
    ) => {
      if (!numericAttrId || !dataConfig) return
      const labelSelection = select(labelRef.current)
      const labelCoords = measure.labelCoords
      const labelLeft = labelCoords
        ? labelCoords.x
        : isVerticalRef.current
          ? helper.xScalePct(plotValue)
          : 0
      const labelTop = labelCoords ? labelCoords.y : helper.yRangePct(defaultLabelTopOffset(model))
      const labelId =
        `${helper.measureSlug}-measure-labels-tip-${containerId}${helper.classFromKey ? `-${helper.classFromKey}` : ""}`
      const labelClass = clsx("measure-labels-tip", `measure-labels-tip-${helper.measureSlug}`)

      labelObj.label = labelSelection.append("div")
        .attr("class", labelClass)
        .attr("id", labelId)
        .attr("data-testid", labelId)
        .style("left", `${100 * labelLeft}%`)
        .style("top", `${100 * labelTop}%`)
        .html(textContent)

      labelObj.label.call(
        drag<HTMLDivElement, unknown>()
          .on("drag", (e) => helper.handleMoveLabel(e, labelId))
          .on("end", (e) => helper.handleEndMoveLabel(e, labelId))
      )

      labelObj.label.on("mouseover", () => highlightCovers(true))
        .on("mouseout", () => highlightCovers(false))

      selectionsObj.errorBarHoverCover?.on("mouseover", () => highlightLabel(labelId, true))
        .on("mouseout", () => highlightLabel(labelId, false))

    }, [containerId, dataConfig, defaultLabelTopOffset, helper, highlightCovers, highlightLabel,
        isVerticalRef, labelRef, model, numericAttrId])

    const addTextTip = useCallback((plotValue: number, textContent: string, valueObj: IStandardErrorSelections) => {
      const measure = model?.measures.get(helper.instanceKey)
      if (!spannerRef || !measure) return
      // const selection = select(valueRef.current)
      const selection = select(spannerRef.current)
      selection.attr("class", "measure-container")  // So the classes applied to the text tip
                                                                // will be scoped to the spanner
      const textId = helper.generateIdString("tip")
      const textClass = clsx(
        "measure-tip",
        `${helper.measureSlug}-tip`,
        {"show-on-overlap-hover": isBlockingOtherMeasure}
      )
      const textTipWidth = measureText(textContent, "bold 12px sans-serif")
      const lineOffset = 5
      const labelCoords = measure.labelCoords || {x: 0, y: 0}
      const rangeOffset = rangeValue && rangeValue !== plotValue
        ? isVerticalRef.current
          ? helper.xScale(rangeValue) - helper.xScale(plotValue)
          : helper.yScale(rangeValue) - helper.yScale(plotValue)
        : 0
      const cellWidth = layout.plotWidth / cellCounts.x  // Use the full width of the graph
      const cellHeight = layout.plotHeight / cellCounts.y  // Use the full height of the graph
      let x = cellWidth * cellCoords.col + (isVerticalRef.current
        ? helper.xScale(range.max) / cellCounts.x + lineOffset
        : Math.max(0, (plotWidth - plotWidth / 2) / cellCounts.x - textTipWidth / 2 + cellWidth * cellCoords.col))
      let y = cellHeight * cellCoords.row + (isVerticalRef.current ? labelCoords.y + kBarCoord
        : helper.yScale(plotValue) / cellCounts.y - lineOffset)
      if ((rangeValue || rangeValue === 0) && !isVerticalRef.current) {
        y = (helper.yScale(plotValue) + rangeOffset) / cellCounts.y - lineOffset
      }

      // If x plus the approximate width of the text tip would extend beyond the right boundary of the graph, set x to
      // graph's width minus the text tip width or zero, whichever is greater.
      if (x + textTipWidth > layout.plotWidth) x = Math.max(layout.plotWidth - textTipWidth, 0)
      valueObj.text = selection.append("text")
        .text(textContent)
        .attr("class", textClass)
        .attr("id", textId)
        .attr("data-testid", textId)
        .attr("x", x)
        .attr("y", y)

      valueObj.errorBarHoverCover?.on("mouseover", () => toggleTextTip(valueObj.text, true))
        .on("mouseout", () => toggleTextTip(valueObj.text, false))
    }, [cellCoords.col, cellCoords.row, cellCounts.x, cellCounts.y, helper, isBlockingOtherMeasure,
              isVerticalRef, layout.plotHeight, layout.plotWidth, model?.measures, plotWidth, range.max,
              rangeValue, spannerRef, toggleTextTip])

    const addErrorBar = useCallback((selectionsObj: IStandardErrorSelections) => {
      const kTickLength = 8,
        lowerCoord = isVerticalRef.current
          ? helper.xScale(range.min) / cellCounts.x : helper.yScale(range.min) / cellCounts.y,
        upperCoord = isVerticalRef.current
          ? helper.xScale(range.max) / cellCounts.x : helper.yScale(range.max) / cellCounts.y

      const symbolPath = () => {
        // Note that we use translate just as a way to replace %@ with the actual values
        if (isVerticalRef.current) {
          return t(`M%@,%@ h%@ M%@,%@ v%@ M%@,%@ v%@`, {
            vars: [
              lowerCoord, kBarCoord, (upperCoord - lowerCoord), // Horizontal line
              lowerCoord, kBarCoord - kTickLength / 2, kTickLength, // Lower tick
              upperCoord, kBarCoord - kTickLength / 2, kTickLength // Upper tick
            ]
          })
        } else {
          const xCoord = layout.plotWidth / cellCounts.x - kBarCoord
          return t(`M%@,%@ v%@ M%@,%@ h%@ M%@,%@ h%@`, {
            vars: [
              xCoord, lowerCoord, (upperCoord - lowerCoord), // Vertical line
              xCoord - kTickLength / 2, lowerCoord, kTickLength, // Lower tick
              xCoord - kTickLength / 2, upperCoord, kTickLength // Upper tick
            ]
          })
        }
      }
      const fullHeightLinesPath = () => {
        const graphWidth = layout.plotWidth,
          graphHeight = layout.plotHeight,
          cellWidth = graphWidth / cellCounts.x,
          cellHeight = graphHeight / cellCounts.y,
          templatePath = isVerticalRef.current
            ? `M%@,%@ v%@ M%@,%@ v%@`
            : `M%@,%@ h%@ M%@,%@ h%@`,
          replacementVars = isVerticalRef.current
            ? [
              lowerCoord + cellCoords.col * cellWidth, 0, graphHeight,
              upperCoord + cellCoords.col * cellWidth, 0, graphHeight
            ]
            : [
              0, lowerCoord + cellCoords.row * cellHeight, graphWidth,
              0, upperCoord + cellCoords.row * cellHeight, graphWidth
            ]
        // Note that we use translate just as a way to replace %@ with the actual values
        return t(templatePath, {vars: replacementVars})
      }
      selectionsObj.errorBar = select(valueRef.current).append("path")
        .attr("class", kErrorBarPathClass)
        .attr("id", `${helper.generateIdString("path")}`)
        .attr("data-testid", `${helper.measureSlug}-error-bar`)
        .attr("d", symbolPath())
      selectionsObj.errorBarHoverCover = select(valueRef.current).append("path")
        .attr("class", "standard-error-hover-cover")
        .attr("id", `${helper.generateIdString("path")}`)
        .attr("data-testid", `${helper.measureSlug}-error-bar`)
        .attr("d", symbolPath())
      // We want the full-height lines to extend to the edges of the plot, so we use the graph's width and height
      // We also have to append them to an svg element that is part of the container, not the plot, so that they
      // don't get clipped.
      selectionsObj.errorBarFullHeightLines = spannerRef && select(spannerRef.current).append("path")
        .attr("class", kFullHighLinesClass)
        .attr("id", `${helper.generateIdString("path")}`)
        .attr("data-testid", `${helper.measureSlug}-error-bar`)
        .attr("d", fullHeightLinesPath())
    }, [cellCoords.col, cellCoords.row, cellCounts.x, cellCounts.y, helper, isVerticalRef, layout.plotHeight,
              layout.plotWidth, range.max, range.min, spannerRef, valueRef])

    const addAdornmentElements = useCallback((measure: IMeasureInstance,
                                              selectionsObj: IStandardErrorSelections, labelObj: ILabel) => {

      if (!numericAttrId || !dataConfig) return
      const stdErr = model.measureValue(numericAttrId, cellKey, dataConfig)
      if (stdErr === undefined || isNaN(stdErr) || isNaN(range.min) || isNaN(range.max)) return

      addErrorBar(valueObjRef.current)

      const textContent = helper.computeTextContentForStdErr(dataConfig, stdErr, model.numStErrs, showLabel)

      // If showLabel is true, then the Show Measure Labels option is selected, so we add a label to the adornment,
      // otherwise we add a text tip that only appears when the user mouses over the value line or the range boundaries.
      if (showLabel) {
        addLabels(labelObj, measure, textContent, selectionsObj, range.max)
      } else {
        addTextTip(range.max, textContent, selectionsObj)
      }
    }, [numericAttrId, dataConfig, model, cellKey, range.min, range.max, addErrorBar, helper,
              showLabel, addLabels, addTextTip])

    // Add the lines and their associated covers and labels
    const refreshValues = useCallback(() => {
      if (!model.isVisible) return
      const measure = model?.measures.get(helper.instanceKey)

      // We're creating a new set of elements, so remove the old ones
      Object.values(valueObjRef.current).forEach((aSelection) => aSelection.remove())
      valueObjRef.current = {}
      const newLabelObj: ILabel = {}
      const selection = select(valueRef.current)
      const labelSelection = select(labelRef.current)

      // Remove the previous value's elements
      selection.html(null)
      labelSelection.html(null)

      if (measure) {
        addAdornmentElements(measure, valueObjRef.current, newLabelObj)
      }
    }, [addAdornmentElements, helper.instanceKey, labelRef, model.isVisible, model?.measures, valueRef])

    useEffect(() => {
      // Clean up any existing elements
      return () => {
        Object.values(valueObjRef.current).forEach((aSelection) => aSelection.remove())
      }
    }, [])

    return (
      <UnivariateMeasureAdornmentBaseComponent
        classFromKey={helper.classFromKey}
        containerId={containerId}
        labelRef={labelRef}
        measureSlug={helper.measureSlug}
        model={model}
        showLabel={!!showLabel}
        valueRef={valueRef}
        refreshValues={refreshValues}
        setIsVertical={(adornmentIsVertical: boolean) => {
          isVerticalRef.current = adornmentIsVertical
        }}
        xAxis={xAxis}
        yAxis={yAxis}
      />
    )
  }
)
