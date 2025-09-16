import React, { useCallback, useEffect, useMemo, useRef } from "react"
import { drag, select, Selection } from "d3"
import { observer } from "mobx-react-lite"
import { clsx } from "clsx"
import { t } from "../../../../../utilities/translation/translate"
import { getDocumentContentPropertyFromNode } from "../../../../../utilities/mst-utils"
import { measureText } from "../../../../../hooks/use-measure-text"
import { fitGaussianGradientDescent, normal, sqrtTwoPi } from "../../../../../utilities/math-utils"
import { useGraphContentModelContext } from "../../../hooks/use-graph-content-model-context"
import { isBinnedPlotModel } from "../../../plots/histogram/histogram-model"
import { curveBasis } from "../../../utilities/graph-utils"
import { IAdornmentComponentProps } from "../../adornment-component-info"
import { UnivariateMeasureAdornmentHelper } from "../univariate-measure-adornment-helper"
import { useAdornmentAttributes } from "../../../hooks/use-adornment-attributes"
import { useAdornmentCells } from "../../../hooks/use-adornment-cells"
import { ILabel } from "../univariate-measure-adornment-types"
import { IMeasureInstance } from "../univariate-measure-adornment-model"
import { UnivariateMeasureAdornmentBaseComponent } from "../univariate-measure-adornment-base-component"
import { kGaussianFitLabelKey, kNormalCurveClass, kNormalCurveMeanValueTitleKey, kNormalCurveStdDevValueTitleKey }
  from "./normal-curve-adornment-types"
import { kStandardErrorType } from "../standard-error/standard-error-adornment-types"
import { INormalCurveAdornmentModel } from "./normal-curve-adornment-model"
import { isStandardErrorAdornment } from "../standard-error/standard-error-adornment-model"

interface INormalCurveSelections {
  normalCurve?: Selection<SVGPathElement, unknown, null, undefined>
  normalCurveHoverCover?: Selection<SVGPathElement, unknown, null, undefined>
  text?: Selection<SVGTextElement, unknown, null, undefined>
  divText?: Selection<HTMLDivElement, unknown, HTMLElement, undefined>
}

const kNormalCurveStrokeColor = "#027d34"

export const NormalCurveAdornmentComponent = observer(
  function NormalCurveAdornmentComponent(props: IAdornmentComponentProps) {
    const {
      cellKey = {}, cellCoords, containerId, plotHeight, plotWidth,
      xAxis, yAxis, spannerRef
    } = props
    const graphModel = useGraphContentModelContext()
    const model = props.model as INormalCurveAdornmentModel
    const {
      dataConfig, layout, adornmentsStore,
      numericAttrId, showLabel, isVerticalRef, valueRef,
      labelRef, defaultLabelTopOffset
    } = useAdornmentAttributes()
    const helper = useMemo(() => {
      return new UnivariateMeasureAdornmentHelper(cellKey, isVerticalRef, layout, model, containerId)
    }, [cellKey, containerId, isVerticalRef, layout, model])
    const isHistogram = graphModel.plotType === "histogram"
    const binnedPlot = isBinnedPlotModel(graphModel.plot) ? graphModel.plot : undefined
    const useGaussianFit = isHistogram && getDocumentContentPropertyFromNode(graphModel, "gaussianFitEnabled")
    const stdErrorAdorn = adornmentsStore.findAdornmentOfType(kStandardErrorType)
    const displayStdErr = stdErrorAdorn?.isVisible
    const numericScale = isVerticalRef.current ? helper.xScale : helper.yScale
    const countScale = isHistogram ? (isVerticalRef.current ? helper.yScale : helper.xScale) : undefined
    const {cellCounts} = useAdornmentCells(model, cellKey)
    const isBlockingOtherMeasure = dataConfig &&
      helper.blocksOtherMeasure({adornmentsStore, attrId: numericAttrId, dataConfig})
    const valueObjRef = useRef<INormalCurveSelections>({})
    const caseCount = dataConfig ? model.getCaseCount(numericAttrId, cellKey, dataConfig) : 0

    const computeMeanAndStdDev: () => ({ mean: number; stdDev: number, numStdErrs:number,
                                        stdError: number | undefined }) =
      useCallback(() => {
        const { sampleMean, sampleStdDev } = model.getCurveParamValue(cellKey)
        if (!useGaussianFit) {
          return {mean: sampleMean, stdDev: sampleStdDev, numStdErrs: 1, stdError: undefined}
        } else {
          const count = dataConfig ? model.getCaseCount(numericAttrId, cellKey, dataConfig) : 0,
            binAlignment = binnedPlot?.binAlignment ?? 0,
            binWidth = binnedPlot?.binWidth ?? 1,
            amp = (1 / (sampleStdDev * sqrtTwoPi)) * count * binWidth,
            points = dataConfig
              ? model.computeHistogram(binAlignment, binWidth, numericAttrId, cellKey, dataConfig) : [],
            {mu, sigma} = fitGaussianGradientDescent(points, amp, sampleMean, sampleStdDev),
            numStandardErrs = isStandardErrorAdornment(stdErrorAdorn) ? stdErrorAdorn?.numStErrs : 1
          return {mean: mu, stdDev: sigma, numStdErrs: numStandardErrs,
            stdError: displayStdErr ? sigma / Math.sqrt(caseCount) : undefined}
        }
      }, [binnedPlot, caseCount, cellKey, dataConfig, displayStdErr,
          model, numericAttrId, stdErrorAdorn, useGaussianFit])

    const {mean, stdDev, numStdErrs, stdError} = computeMeanAndStdDev()

    const highlightCovers = useCallback((highlight: boolean) => {
      const cover = valueObjRef.current.normalCurveHoverCover,
        coverClassName = `normal-curve-hover-cover${highlight ? ' highlighted' : ''}`
      cover?.attr("class", coverClassName)
    }, [])

    const highlightLabel = useCallback((labelId: string, highlight: boolean) => {
      const label = select(`#${labelId}`)
      label.classed("highlighted", highlight)
      highlightCovers(highlight)
    }, [highlightCovers])

    const toggleTextTip = useCallback((tip: Selection<SVGTextElement, unknown, null, undefined> | undefined,
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
      labelObj: ILabel, measure: IMeasureInstance, textContent: string, selectionsObj: INormalCurveSelections,
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

      selectionsObj.normalCurveHoverCover?.on("mouseover", () => highlightLabel(labelId, true))
        .on("mouseout", () => highlightLabel(labelId, false))

    }, [containerId, dataConfig, defaultLabelTopOffset, helper, highlightCovers, highlightLabel,
        isVerticalRef, labelRef, model, numericAttrId])

    const addTextTip = useCallback((plotValue: number, textContent: string, valueObj: INormalCurveSelections) => {
      const measure = model?.measures.get(helper.instanceKey)
      if (!spannerRef || !measure) return
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
      const cellWidth = layout.plotWidth / cellCounts.x  // Use the full width of the graph
      const cellHeight = layout.plotHeight / cellCounts.y  // Use the full height of the graph
      let x = cellWidth * cellCoords.col + (isVerticalRef.current
        ? helper.xScale(plotValue) / cellCounts.x + lineOffset
        : Math.max(0, (plotWidth - plotWidth / 2) / cellCounts.x - textTipWidth / 2 + cellWidth * cellCoords.col))
      const y = cellHeight * cellCoords.row + (isVerticalRef.current ? plotHeight / 2
        : helper.yScale(plotValue) / cellCounts.y - lineOffset)

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

      valueObj.normalCurveHoverCover?.on("mouseover", () => toggleTextTip(valueObj.text, true))
        .on("mouseout", () => toggleTextTip(valueObj.text, false))
    }, [cellCoords.col, cellCoords.row, cellCounts.x, cellCounts.y, helper, isBlockingOtherMeasure,
      isVerticalRef, layout.plotHeight, layout.plotWidth, model?.measures,
      plotHeight, plotWidth, spannerRef, toggleTextTip])

    const addNormalCurve = useCallback((selectionsObj: INormalCurveSelections) => {

      /**
       * Create the path string for
       *   - the normal curve
       *   - the line from the peak to the axis
       *   - the line segment representing one standard deviation on each side of the mean
       *   - the line segment representing a specified number of standard errors on each side of the mean
       */
      const symbolPathF = (p: { x: number, y: number, width: number, cellHeight: number }, iIsHorizontal: boolean) => {
        const normalF = (x: number) => {
          return normal(x, amplitude, mean, stdDev)
        }

        const countToScreenCoordFromDotPlot = (iCount: number) => {
          const tStackCoord = (2 * pointRadius - overlap) * iCount + 1
          return iIsHorizontal ? p.y - tStackCoord : p.x + tStackCoord
        }

        const countToScreenCoordFromHistogram = (iCount: number) => {
          if (!countScale) {
            return 0
          } else {
            return isVerticalRef.current ? countScale(iCount) / cellCounts.y : countScale(iCount) / cellCounts.x
          }
        }

        const countAxisFunc = isHistogram ? countToScreenCoordFromHistogram : countToScreenCoordFromDotPlot,
          pointRadius = graphModel.getPointRadius(),
          numCellsNumeric = isVerticalRef.current ? cellCounts.x : cellCounts.y,
          overlap = graphModel.pointOverlap,
          binWidth = binnedPlot?.binWidth ?? Math.abs(numericScale.invert(pointRadius * 2) - numericScale.invert(0))

        if (!countAxisFunc || binWidth === undefined) return ""

        const
          pixelRange = numericScale.range(),
          pixelMin = isVerticalRef.current ? pixelRange[0] : pixelRange[1],
          pixelMax = isVerticalRef.current ? pixelRange[1] : pixelRange[0],
          numeratorForAmplitude = isHistogram ? 1 : numCellsNumeric,
          // todo: Determine whether for a gaussian fit amplitude is a fitted parameter. (Probably not!)
          amplitude = (numeratorForAmplitude / (stdDev * sqrtTwoPi)) * caseCount * binWidth,
          points = [],
          kPixelGap = 1,
          meanSegmentPixelLength = countAxisFunc(normalF(mean)) - countAxisFunc(0),
          sDSegmentPixelLength = (numericScale(mean + stdDev) - numericScale(mean - stdDev)) / numCellsNumeric,
          sELowerValue = stdError ? mean - numStdErrs * stdError : 0,
          sEUpperValue = stdError ? mean + numStdErrs * stdError : 0,
          sESegmentPixelLength = stdError
            ? (numericScale(sEUpperValue) - numericScale(sELowerValue)) / numCellsNumeric : 0
        let numericValue, countValue, pixelCount, pixelNumeric, point
        for (pixelNumeric = pixelMin; pixelNumeric <= pixelMax; pixelNumeric += kPixelGap) {
          numericValue = numericScale.invert(pixelNumeric)
          countValue = normalF(numericValue)
          if (isFinite(countValue)) {
            pixelCount = countAxisFunc(countValue)
            point = iIsHorizontal ? {x: pixelNumeric / numCellsNumeric, y: pixelCount}
              : {x: pixelCount, y: pixelNumeric / numCellsNumeric}
            points.push(point)
          }
        }
        const normalCurvePath = points.length > 0 ? `M${points[0].x},${points[0].y},${curveBasis(points)}` : ""

        const meanSegment = iIsHorizontal ? t('M%@,%@ v%@', {
            vars: [numericScale(mean) / numCellsNumeric, countAxisFunc(0), meanSegmentPixelLength]
          })
          : t('M%@,%@ h%@', {
            vars: [countAxisFunc(0), numericScale(mean) / numCellsNumeric, meanSegmentPixelLength]
          })

        const sDSegment = iIsHorizontal ? t(' M%@,%@ h%@', {
            vars: [numericScale(mean - stdDev) / numCellsNumeric, countAxisFunc(normalF(mean - stdDev)),
              sDSegmentPixelLength]
          })
          : t(' M%@,%@ v%@', {
            vars: [countAxisFunc(normalF(mean - stdDev)), numericScale(mean - stdDev) / numCellsNumeric,
              sDSegmentPixelLength]
          })
        const sESegment = stdError
          ? (iIsHorizontal ? t(' M%@,%@ h%@', {
              vars: [numericScale(sELowerValue) / numCellsNumeric, countAxisFunc(normalF(sELowerValue)),
                sESegmentPixelLength]
            })
            : t(' M%@,%@ v%@', {
              vars: [countAxisFunc(normalF(sELowerValue)), numericScale(sELowerValue) / numCellsNumeric,
                sESegmentPixelLength]
            })) : ''
      return normalCurvePath + meanSegment + sDSegment + sESegment
    }
    const theSymbolPath = symbolPathF({
        x: 0, y: layout.plotHeight / cellCounts.y,
        width: 0, cellHeight: 0
      },
      isVerticalRef.current)

    selectionsObj.normalCurve = select(valueRef.current).append("path")
      .attr("class", kNormalCurveClass)
      .attr("id", `${helper.generateIdString("path")}`)
      .attr("data-testid", `${helper.measureSlug}-normal-curve`)
      .attr("d", theSymbolPath)
    selectionsObj.normalCurveHoverCover = select(valueRef.current).append("path")
      .attr("class", `${kNormalCurveClass}-hover-cover`)
      .attr("id", `${helper.generateIdString("path")}`)
      .attr("data-testid", `${helper.measureSlug}-normal-curve`)
      .attr("d", theSymbolPath)
  }, [binnedPlot, caseCount, cellCounts, countScale, graphModel, helper, isHistogram, isVerticalRef,
      layout, mean, numStdErrs, numericScale, stdDev, stdError, valueRef])

    const addAdornmentElements = useCallback((measure: IMeasureInstance,
                                              selectionsObj: INormalCurveSelections, labelObj: ILabel) => {
      if (!numericAttrId || !dataConfig || mean === undefined || isNaN(mean) ||
        isNaN(stdDev) || !numericScale.invert) return
      const numericAttr = dataConfig?.dataset?.attrFromID(numericAttrId) ?? null
      const numericAttrUnits = numericAttr?.units
      const meanDisplayValue = helper.formatValueForScale(mean)
      const sdDisplayValue = helper.formatValueForScale(stdDev)

      addNormalCurve(selectionsObj)

      const gaussianFitTitle = useGaussianFit
        ? showLabel
          ? `<p style="text-decoration-line:underline;color:${kNormalCurveStrokeColor}"> ${t(kGaussianFitLabelKey)}</p>`
          : `${t(kGaussianFitLabelKey)}: `
        : ""

      const meanValueString = t(kNormalCurveMeanValueTitleKey, {vars: [meanDisplayValue]})
      const sdValueString = t(kNormalCurveStdDevValueTitleKey, {vars: [sdDisplayValue]})

      const unitsString = `${numericAttrUnits ? ` ${numericAttrUnits}` : ""}`
      const unitsContent = showLabel ? `<span class="units">${unitsString}</span>` : unitsString
      const meanValueContent = showLabel
        ? `<p style = "color:${kNormalCurveStrokeColor}">${meanValueString}${unitsContent}</p>`
        : `${meanValueString}, `
      const sdValueContent = showLabel
        ? `<p style = "color:${kNormalCurveStrokeColor}">${sdValueString}${unitsContent}</p>`
        : sdValueString
      const stdErrValueContent = stdError
        ? helper.computeTextContentForStdErr(dataConfig, stdError, numStdErrs, showLabel) : ""
      const textContent = `${gaussianFitTitle}${meanValueContent}${sdValueContent}${stdErrValueContent}`

      // If showLabels is true, then the Show Measure Labels option is selected, so we add a label to the adornment,
      // otherwise we add a text tip that only appears when the user mouses over the value line or the range boundaries.
      if (showLabel) {
        addLabels(labelObj, measure, textContent, selectionsObj, mean)
      } else {
        addTextTip(mean, textContent, selectionsObj)
      }
    }, [numericAttrId, dataConfig, mean, stdDev, numericScale.invert, helper, addNormalCurve,
      useGaussianFit, showLabel, stdError, numStdErrs, addLabels, addTextTip])

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

    if (!graphModel.plot.canShowBoxPlotAndNormalCurve) {
      return
    }

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
