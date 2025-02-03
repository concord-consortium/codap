import React, { useCallback, useEffect, useMemo, useRef } from "react"
import { drag, select, selectAll } from "d3"
import { observer } from "mobx-react-lite"
import { clsx } from "clsx"
import { t } from "../../../../utilities/translation/translate"
import { IMeasureInstance, IUnivariateMeasureAdornmentModel } from "./univariate-measure-adornment-model"
import { measureText } from "../../../../hooks/use-measure-text"
import { IAdornmentComponentProps } from "../adornment-component-info"
import { ILabel, IValue } from "./univariate-measure-adornment-types"
import { UnivariateMeasureAdornmentHelper } from "./univariate-measure-adornment-helper"
import { UnivariateMeasureAdornmentBaseComponent } from "./univariate-measure-adornment-base-component"
import { useAdornmentAttributes } from "../../hooks/use-adornment-attributes"
import { useAdornmentCells } from "../../hooks/use-adornment-cells"

export const UnivariateMeasureAdornmentSimpleComponent = observer(
  function UnivariateMeasureAdornmentSimpleComponent (props: IAdornmentComponentProps) {
    const {cellKey={}, containerId, plotHeight, plotWidth, xAxis, yAxis} = props
    const model = props.model as IUnivariateMeasureAdornmentModel
    const {
      dataConfig, layout, adornmentsStore,
      numericAttrId, showLabel, isVertical, valueRef,
      labelRef, defaultLabelTopOffset } = useAdornmentAttributes()
    const { cellCounts } = useAdornmentCells(model, cellKey)
    const helper = useMemo(() => {
      return new UnivariateMeasureAdornmentHelper(cellKey, layout, model, containerId)
    }, [cellKey, containerId, layout, model])
    const isBlockingOtherMeasure = dataConfig &&
      helper.blocksOtherMeasure({adornmentsStore, attrId: numericAttrId, dataConfig, isVertical: isVertical.current})
    const valueObjRef = useRef<IValue>({})

    const highlightCovers = useCallback((highlight: boolean) => {
      const covers = selectAll(`#${helper.measureSlug}-${containerId} .${helper.measureSlug}-cover`)
      covers.classed("highlighted", highlight)
    }, [containerId, helper])

    const highlightLabel = useCallback((labelId: string, highlight: boolean) => {
      const label = select(`#${labelId}`)
      label.classed("highlighted", highlight)
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
      labelObj: ILabel, measure: IMeasureInstance, textContent: string, valueObj: IValue,
      plotValue: number, range?: number
    ) => {
      const labelSelection = select(labelRef.current)
      const labelCoords = measure.labelCoords
      let labelLeft = labelCoords
        ? labelCoords.x
        : isVertical.current
          ? helper.xScalePct(plotValue)
          : 0
      if (range != null && isVertical.current) labelLeft = helper.xScalePct(range)
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

      if (!range && range !== 0) {
        valueObj.cover?.on("mouseover", () => highlightLabel(labelId, true))
          .on("mouseout", () => highlightLabel(labelId, false))
      }

      valueObj.rangeMinCover?.on("mouseover", () => highlightLabel(labelId, true))
        .on("mouseout", () => highlightLabel(labelId, false))
      valueObj.rangeMaxCover?.on("mouseover", () => highlightLabel(labelId, true))
        .on("mouseout", () => highlightLabel(labelId, false))

    }, [containerId, defaultLabelTopOffset, helper, highlightCovers, highlightLabel, isVertical, labelRef, model])

    const addTextTip = useCallback((plotValue: number, textContent: string, valueObj: IValue, range?: number) => {
      const selection = select(valueRef.current)
      const textId = helper.generateIdString("tip")
      const textClass = clsx(
        "measure-tip",
        `${helper.measureSlug}-tip`,
        { "show-on-overlap-hover": isBlockingOtherMeasure }
      )
      const textTipWidth = measureText(textContent, "10px Lato, sans-serif")
      const lineOffset = 5
      const topOffset = plotHeight / cellCounts.y * .25 // 25% of the height of the subplot
      const rangeOffset = range && range !== plotValue
        ? isVertical.current
          ? helper.xScale(range) - helper.xScale(plotValue)
          : helper.yScale(range) - helper.yScale(plotValue)
        : 0
      let x = isVertical.current
          ? helper.xScale(plotValue) / cellCounts.x + lineOffset
          : plotWidth - plotWidth/2 - textTipWidth/2
      if ((range || range === 0) && isVertical.current) {
        x = (helper.xScale(plotValue) + rangeOffset) / cellCounts.x + lineOffset
      }
      let y = isVertical.current ? topOffset : helper.yScale(plotValue) / cellCounts.y - lineOffset
      if ((range || range === 0) && !isVertical.current) {
        y = (helper.yScale(plotValue) + rangeOffset) / cellCounts.y - lineOffset
      }

      // If x plus the approximate width of the text tip would extend beyond the right boundary of the subplot, set x to
      // plotWidth minus the text tip width or zero, whichever is greater.
      if (x + textTipWidth > plotWidth) x = Math.max(plotWidth - textTipWidth, 0)

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

    }, [cellCounts.x, cellCounts.y, helper, isBlockingOtherMeasure, isVertical, plotHeight, plotWidth,
      toggleTextTip, valueRef])

    const addAdornmentElements = useCallback((measure: IMeasureInstance, valueObj: IValue, labelObj: ILabel) => {
      if (!numericAttrId || !dataConfig) return
      const value = model.measureValue(numericAttrId, cellKey, dataConfig)
      if (value === undefined || isNaN(value)) return

      const primaryAttrId = dataConfig?.primaryAttributeID
      const primaryAttr = primaryAttrId ? dataConfig?.dataset?.attrFromID(primaryAttrId) : undefined
      const primaryAttrUnits = primaryAttr?.units
      const { coords, coverClass, coverId, displayRange, displayValue, lineClass, lineId, measureRange, plotValue } =
        helper.adornmentSpecs(numericAttrId, dataConfig, value, isVertical.current, cellCounts)

      const translationVars = [
        `${(measureRange.min || measureRange.min === 0) && displayRange ? `${displayRange}` : `${displayValue}`}`
      ]

      const valueContent = `${t(model.labelTitle, { vars: translationVars })}`
      const unitContent = `${primaryAttrUnits ? ` ${primaryAttrUnits}` : ""}`
      const textContent = `${valueContent}${unitContent}`

      // Add the main value line
      const lineSpecs = {
        isVertical: isVertical.current,
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
          isVertical: isVertical.current,
          lineClass,
          rangeMin: measureRange.min,
          rangeMax: measureRange.max,
        }
        helper.addRange(valueRef.current, valueObj, rangeSpecs)
      }

      // If showLabels is true, then the Show Measure Labels option is selected, so we add a label to the adornment,
      // otherwise we add a text tip that only appears when the user mouses over the value line or the range boundaries.
      if (showLabel) {
        addLabels(labelObj, measure, textContent, valueObj, plotValue, measureRange.max)
      } else {
        addTextTip(plotValue, textContent, valueObj, measureRange.max)
      }
    }, [numericAttrId, dataConfig, model, cellKey, helper, isVertical, cellCounts, valueRef, showLabel,
              addLabels, addTextTip])

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
        Object.values(valueObjRef.current).forEach((aSelection) => aSelection?.remove())
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
        setIsVertical={(adornmentIsVertical: boolean) => { isVertical.current = adornmentIsVertical }}
        xAxis={xAxis}
        yAxis={yAxis}
      />
    )
  }
)
