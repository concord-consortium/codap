import React, { useCallback, useEffect, useMemo, useRef } from "react"
import { drag, select, selectAll } from "d3"
import { observer } from "mobx-react-lite"
import { clsx } from "clsx"
import { t } from "../../../../utilities/translation/translate"
import { isFiniteNumber } from "../../../../utilities/math-utils"
import { IMeasureInstance, IUnivariateMeasureAdornmentModel } from "./univariate-measure-adornment-model"
import { measureText } from "../../../../hooks/use-measure-text"
import { IAdornmentComponentProps } from "../adornment-component-info"
import { IValue } from "./univariate-measure-adornment-types"
import { UnivariateMeasureAdornmentHelper } from "./univariate-measure-adornment-helper"
import { UnivariateMeasureAdornmentBaseComponent } from "./univariate-measure-adornment-base-component"
import { useAdornmentAttributes } from "../../hooks/use-adornment-attributes"
import { useAdornmentCells } from "../../hooks/use-adornment-cells"

export const UnivariateMeasureAdornmentSimpleComponent = observer(
  function UnivariateMeasureAdornmentSimpleComponent (props: IAdornmentComponentProps) {
    const {cellKey={}, containerId,
      xAxis, yAxis, spannerRef, labelsDivRef} = props
    const model = props.model as IUnivariateMeasureAdornmentModel
    const {
      dataConfig, layout, adornmentsStore,
      numericAttrId, showLabel, isVerticalRef, valueRef,
      labelRef, defaultLabelTopOffset } = useAdornmentAttributes()
    const { cellCounts } = useAdornmentCells(model, cellKey)
    const helper = useMemo(() => {
      return new UnivariateMeasureAdornmentHelper(cellKey, isVerticalRef, layout, model,
        containerId, defaultLabelTopOffset)
    }, [cellKey, containerId, defaultLabelTopOffset, isVerticalRef, layout, model])
    const isBlockingOtherMeasure = dataConfig &&
      helper.blocksOtherMeasure({adornmentsStore, attrId: numericAttrId, dataConfig})
    const valueObjRef = useRef<IValue>({})

    const highlightCovers = useCallback((highlight: boolean) => {
      const covers = selectAll(`#${helper.measureSlug}-${containerId} .${helper.measureSlug}-cover`)
      covers.classed("highlighted", highlight)
    }, [containerId, helper])

    const highlightLabel = useCallback((labelId: string, highlight: boolean) => {
      const labelDiv = select(`#${labelId}`)
      labelDiv.classed("highlighted", highlight)
      highlightCovers(highlight)
    }, [highlightCovers])

    const toggleTextTip = useCallback((tipId: string, visible: boolean) => {
      const tip = select(`#${tipId}`)
      tip.classed("visible", visible)
      highlightCovers(visible)
      if (isBlockingOtherMeasure) {
        const containerNode: Element = select(`#${containerId}`).node() as Element
        const parentContainer = containerNode.parentNode as Element
        const blockedMeasureTips = select(parentContainer).selectAll(`.show-on-overlap-hover`).filter((d, i, nodes) => {
          return (nodes[i] as SVGTextElement).id !== tipId
        })
        blockedMeasureTips.classed("visible offset", visible)
      }
    }, [containerId, highlightCovers, isBlockingOtherMeasure])

    const addLabels = useCallback((
      measure: IMeasureInstance, textContent: string, valueObj: IValue,
      plotValue: number, range?: number
    ) => {
      if (!labelsDivRef?.current) return
      const labelSelection = select(labelsDivRef.current)
      const labelCoords = measure.labelCoords
      const valueToLabel = isFiniteNumber(range) ? range : plotValue
      const { left, top } =
        (dataConfig && helper.measureLabelCoordinates(dataConfig, valueToLabel)) || { left: 0, top: 0 }
      const labelLeft = labelCoords ? labelCoords.x : left
      const labelTop = labelCoords ? labelCoords.y : top
      const labelId =
        `${helper.measureSlug}-measure-labels-tip-${containerId}${helper.classFromKey ? `-${helper.classFromKey}` : ""}`
      const labelClass = clsx("measure-labels-tip", `measure-labels-tip-${helper.measureSlug}`)

      valueObj.label = labelSelection.append("div")
        .attr("class", labelClass)
        .attr("id", labelId)
        .attr("data-testid", labelId)
        .style("left", `${100 * labelLeft}%`)
        .style("top", `${100 * labelTop}%`)
        .html(textContent)

      valueObj.label.call(
        drag<HTMLDivElement, unknown>()
          .on("drag", (e) => helper.handleMoveLabel(e, labelId))
          .on("end", (e) => helper.handleEndMoveLabel(e, labelId))
      )

      valueObj.label.on("mouseover", () => highlightCovers(true))
        .on("mouseout", () => highlightCovers(false))

      if (!range && range !== 0) {
        valueObj.cover?.on("mouseover", () => highlightLabel(labelId, true))
          .on("mouseout", () => highlightLabel(labelId, false))
      }

      valueObj.rangeMinCover?.on("mouseover", () => highlightLabel(labelId, true))
        .on("mouseout", () => highlightLabel(labelId, false))
      valueObj.rangeMaxCover?.on("mouseover", () => highlightLabel(labelId, true))
        .on("mouseout", () => highlightLabel(labelId, false))

    },
      [containerId, dataConfig, helper, highlightCovers, highlightLabel, labelsDivRef])

    const addTextTip = useCallback((plotValue: number, textContent: string, valueObj: IValue, range?: number) => {
      if (!spannerRef?.current) return
      const totalPlotWidth = layout.plotWidth || 0
      const totalPlotHeight = layout.plotHeight || 0
      const selection = select(spannerRef.current)
      const textId = helper.generateIdString("tip")
      const textClass = clsx(
        "measure-tip",
        `${helper.measureSlug}-tip`,
        { "show-on-overlap-hover": isBlockingOtherMeasure }
      )
      const textTipWidth = measureText(textContent, "12px Lato, sans-serif") + 5 // Add 5px for padding
      const lineOffset = 5
      const topOffset = totalPlotHeight / cellCounts.y * .25 // 25% of the height of the subplot
      const valueToLabel = isFiniteNumber(range) ? range : plotValue
      // (left, top) are proportion coordinates for the label. Adjust for tip.
      const { left, top } =
      (dataConfig && helper.measureLabelCoordinates(dataConfig, valueToLabel)) || { left: 0, top: 0 }
      const bandWidth = totalPlotWidth / cellCounts.x
      const x = isVerticalRef.current
          ? Math.min(left * totalPlotWidth + lineOffset, totalPlotWidth - textTipWidth)
          : Math.min(totalPlotWidth - textTipWidth,
              left * totalPlotWidth + bandWidth - bandWidth/2 - textTipWidth/2)
      const y = isVerticalRef.current ? topOffset + top * totalPlotHeight
        : top * totalPlotHeight + helper.yScale(plotValue) / cellCounts.y - lineOffset

      valueObj.text = selection.append("text")
        .text(textContent)
        .attr("class", textClass)
        .attr("id", textId)
        .attr("data-testid", textId)
        .attr("x", x)
        .attr("y", y)

      valueObj.cover?.on("mouseover", () => toggleTextTip(textId, true))
        .on("mouseout", () => toggleTextTip(textId, false))
      valueObj.rangeMinCover?.on("mouseover", () => toggleTextTip(textId, true))
        .on("mouseout", () => toggleTextTip(textId, false))
      valueObj.rangeMaxCover?.on("mouseover", () => toggleTextTip(textId, true))
        .on("mouseout", () => toggleTextTip(textId, false))

    }, [cellCounts.x, cellCounts.y, dataConfig, helper, isBlockingOtherMeasure, isVerticalRef,
              layout.plotHeight, layout.plotWidth, spannerRef, toggleTextTip])

    const addAdornmentElements = useCallback((measure: IMeasureInstance, valueObj: IValue) => {
      if (!numericAttrId || !dataConfig) return
      const value = model.measureValue(numericAttrId, cellKey, dataConfig)
      if (value === undefined || isNaN(value)) return

      const primaryAttrId = dataConfig?.primaryAttributeID
      const primaryAttr = primaryAttrId ? dataConfig?.dataset?.attrFromID(primaryAttrId) : undefined
      const primaryAttrUnits = primaryAttr?.units
      const { coords, coverClass, coverId, displayRange, displayValue, lineClass, lineId, measureRange, plotValue } =
        helper.adornmentSpecs(numericAttrId, dataConfig, value, cellCounts)

      const translationVars = [
        `${(measureRange.min || measureRange.min === 0) && displayRange ? `${displayRange}` : `${displayValue}`}`
      ]

      const valueContent = `${t(model.labelTitle, { vars: translationVars })}`
      const unitContent = primaryAttrUnits ? ` <span class="units">${primaryAttrUnits}</span>` : ""
      const textContent = `${valueContent}${unitContent}`

      // Add the main value line
      const lineSpecs = {
        isVertical: isVerticalRef.current,
        lineClass,
        lineId,
        x1: coords.x1,
        x2: coords.x2,
        y1: coords.y1,
        y2: coords.y2
      }
      const coverSpecs = {...lineSpecs, lineClass: coverClass, lineId: coverId}
      valueObj.line = helper.newLine(valueRef.current, lineSpecs)

      // Only add a cover for the value line if the adornment doesn't have a range
      if (!model.hasRange) {
        valueObj.cover = helper.newLine(valueRef.current, coverSpecs)
      }

      // If there is a range with valid min and max values, add the range, and the additional range lines
      if ((measureRange?.min || measureRange?.min === 0) && (measureRange?.max || measureRange?.max === 0)) {
        const rangeSpecs = {
          cellCounts,
          coords,
          coverClass,
          isVertical: isVerticalRef.current,
          lineClass,
          rangeMin: measureRange.min,
          rangeMax: measureRange.max,
        }
        helper.addRange(valueRef.current, valueObj, rangeSpecs)
      }

      // If showLabels is true, then the Show Measure Labels option is selected, so we add a label to the adornment,
      // otherwise we add a text tip that only appears when the user mouses over the value line or the range boundaries.
      if (showLabel) {
        addLabels(measure, textContent, valueObj, plotValue, measureRange.max)
      } else {
        addTextTip(plotValue, textContent, valueObj, measureRange.max)
      }
    }, [numericAttrId, dataConfig, model, cellKey, helper, isVerticalRef, cellCounts, valueRef, showLabel,
              addLabels, addTextTip])

    const removeElements = useCallback(() => {
      const currentValueObj = valueObjRef.current
      Object.values(currentValueObj).forEach((aSelection) => aSelection?.remove())
      valueObjRef.current = {}
    }, [])

    // Add the lines and their associated covers and labels
    const refreshValues = useCallback(() => {
      // We're creating a new set of elements, so remove the old ones
      removeElements()
      if (!model.isVisible) return
      const measure = model?.measures.get(helper.instanceKey)
      const selection = select(valueRef.current)

      // Remove the previous value's elements
      selection.html(null)

      if (measure) {
        addAdornmentElements(measure, valueObjRef.current)
      }
    }, [addAdornmentElements, helper.instanceKey, model.isVisible, model?.measures, removeElements, valueRef])

    useEffect(() => {
      // Clean up any existing elements
      return () => {
        removeElements()
      }
    }, [removeElements])

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
        setIsVertical={(adornmentIsVertical: boolean) => { isVerticalRef.current = adornmentIsVertical }}
        xAxis={xAxis}
        yAxis={yAxis}
      />
    )
  }
)
