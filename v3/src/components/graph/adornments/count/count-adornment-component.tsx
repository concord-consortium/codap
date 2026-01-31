import { clsx } from "clsx"
import { isEqual } from "lodash"
import { comparer } from "mobx"
import { observer } from "mobx-react-lite"
import { useCallback, useEffect, useRef, useState } from "react"
import { useForceUpdate } from "../../../../hooks/use-force-update"
import { measureText } from "../../../../hooks/use-measure-text"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { t } from "../../../../utilities/translation/translate"
import { isFiniteNumber } from "../../../../utilities/math-utils"
import { mstReaction } from "../../../../utilities/mst-reaction"
import { isNumericAxisModel } from "../../../axis/models/numeric-axis-models"
import { useAdornmentAttributes } from "../../hooks/use-adornment-attributes"
import { useAdornmentCells } from "../../hooks/use-adornment-cells"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { useGraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"
import { isBinnedDotPlotModel } from "../../plots/binned-dot-plot/binned-dot-plot-model"
import { ICountAdornmentValues, INumDenom } from "../../plots/plot-model"
import { percentString } from "../../utilities/graph-utils"
import { IAdornmentComponentProps } from "../adornment-component-info"
import { kDefaultFontSize } from "../adornment-types"
import { ICountAdornmentModel } from "./count-adornment-model"

import "./count-adornment-component.scss"

export const CountAdornment = observer(function CountAdornment(props: IAdornmentComponentProps) {
  const { cellKey, plotWidth} = props
  const forceUpdate = useForceUpdate()
  const model = props.model as ICountAdornmentModel
  const { classFromKey, instanceKey } = useAdornmentCells(model, cellKey)
  const { xScale, yScale } = useAdornmentAttributes()
  const dataConfig = useGraphDataConfigurationContext()
  const showMeasuresForSelection = !!dataConfig?.showMeasuresForSelection
  const graphModel = useGraphContentModelContext()
  const isBinnedPlot = isBinnedDotPlotModel(graphModel.plot)
  const adornmentsStore = graphModel?.adornmentsStore
  const movableValues = adornmentsStore?.sortedMovableValues(instanceKey) ?? []
  const movableValuesAreShowing = movableValues.length > 0
  const percentType = model.percentType
  const primaryAttrRole = dataConfig?.primaryRole ?? "x"
  const primaryScale = primaryAttrRole === "x" ? xScale : yScale
  const candidateDomain = primaryScale.domain()
  const primaryAxisDomain =
    (candidateDomain.length === 2 ? candidateDomain as [min: number, max: number] : undefined)
  const primaryAxisModel = primaryAttrRole === "x" ? graphModel.getAxis('bottom') : graphModel.getAxis('left')
  const defaultFontSize = graphModel.adornmentsStore.defaultFontSize
  let fontSize = defaultFontSize
  const prevCellWidth = useRef(plotWidth)
  const prevSubPlotRegionWidth = useRef(plotWidth)

  const [countAdornmentValues, setCountAdornmentValues] = useState<Maybe<ICountAdornmentValues>>()
  // Update the adornment values on every render; the deep equality check prevents recursion
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const values = graphModel.plot.countAdornmentValues({cellKey, percentType, movableValues, primaryAxisDomain})
    if (!isEqual(values, countAdornmentValues)) {
      setCountAdornmentValues(values)
    }
  })

  const computeTextContent = useCallback(({numerator, denominator}: INumDenom) => {
    const countNoSelection = 'DG.PlottedCount.withoutSelection',
      countWithSelection = 'DG.PlottedCount.withSelection',
      percentNoSelection = 'DG.PlottedPercent.withoutSelection',
      percentWithSelection = 'DG.PlottedPercent.withSelection',
      countPercentNoSelection = 'DG.PlottedCountPercent.withoutSelection',
      countPercentWithSelection = 'DG.PlottedCountPercent.withSelection'
    const
      primaryIsSplit = dataConfig?.primaryIsCategorical ?? false,
      secondaryIsSplit = dataConfig?.secondaryIsCategorical ?? false,
      showingCount = model.showCount,
      showingPercent = model.showPercent,
      pctString = percentString(numerator / denominator)
    let result = ""
    if (secondaryIsSplit || primaryIsSplit || movableValuesAreShowing || isBinnedPlot) {
      if (showingCount && showingPercent) {
        if (showMeasuresForSelection) {
          result = t(countPercentWithSelection, { vars: [numerator, denominator, pctString] })
        }
        else {
          result = t(countPercentNoSelection, { vars: [numerator, pctString] })
        }
      }
      else if (showingCount) {
        if (showMeasuresForSelection) {
          result = t(countWithSelection, { vars: [numerator] })
        }
        else {
          result = t(countNoSelection, { vars: [numerator] })
        }
      }
      else if (showingPercent) {
        if (showMeasuresForSelection) {
          result = t(percentWithSelection, { vars: [pctString] })
        }
        else {
          result = t(percentNoSelection, { vars: [pctString] })
        }
      }
    }
    else {  // only counts are possible
      if (showMeasuresForSelection) {
        result = t(countWithSelection, { vars: [numerator] })
      }
      else {
        result = t(countNoSelection, { vars: [numerator] })
      }
    }
    return result
  },
    [dataConfig?.primaryIsCategorical, dataConfig?.secondaryIsCategorical, isBinnedPlot,
            model.showCount, model.showPercent, movableValuesAreShowing, showMeasuresForSelection])

  const longestDisplayText = useCallback(() => {
    let longest = ""
    countAdornmentValues?.values.forEach((value) => {
      const displayText = computeTextContent(value)
      if (displayText.length > longest.length) {
        longest = displayText
      }
    })
    return longest
  }, [computeTextContent, countAdornmentValues?.values])

  const resizeText = useCallback(() => {
    const minFontSize = 6
    const maxFontSize = kDefaultFontSize
    const textToMeasure = longestDisplayText()
    const textWidth = measureText(textToMeasure, `${fontSize}px Lato, sans-serif`)
    const subPlotRegionWidth = plotWidth / (countAdornmentValues?.numHorizontalRegions ?? 1)
    const textWidthIsTooWide = textWidth > plotWidth || textWidth > subPlotRegionWidth
    const isContainerShrinking = prevCellWidth.current > plotWidth ||
                                 prevSubPlotRegionWidth.current > subPlotRegionWidth
    const isContainerGrowing = prevCellWidth.current < plotWidth ||
                               prevSubPlotRegionWidth.current < subPlotRegionWidth

    if (isContainerShrinking && textWidthIsTooWide && fontSize > minFontSize) {
      fontSize--
    } else if (isContainerGrowing && !textWidthIsTooWide && fontSize < maxFontSize) {
      fontSize++
    }

    if (fontSize !== defaultFontSize) {
      graphModel.adornmentsStore.setDefaultFontSize(fontSize)
    }
  }, [countAdornmentValues?.numHorizontalRegions, defaultFontSize, fontSize,
            graphModel.adornmentsStore, longestDisplayText, plotWidth])

  const divsToDisplay = useCallback(() => {
    const numBins = countAdornmentValues?.values.length || 1
    const width = plotWidth / (countAdornmentValues?.numHorizontalRegions ?? 1)
    const range = primaryAttrRole === "x" ? xScale.range() : yScale.range()
    return (
      <>
        {
          countAdornmentValues?.values.map((value: INumDenom, i: number) => {
            const {startFraction, endFraction} = value
            const className = clsx(
              {"count": numBins === 1},
              {"sub-count": numBins > 1},
              {"x-axis": primaryAttrRole === "x" && numBins > 1},
              {"y-axis": primaryAttrRole === "y" && numBins > 1},
              {"binned-points-count": !!isBinnedPlot}
            )
            const lowerPixels = isFiniteNumber(startFraction)
                ? range[0] + startFraction * (range[1] - range[0]) : width * i,
              upperPixels = isFiniteNumber(endFraction)
                ? range[0] + endFraction * (range[1] - range[0]) : width * (i + 1),
              widthPixels = upperPixels - lowerPixels
            const style = primaryAttrRole === "x"
              ? {left: `${lowerPixels}px`, width: `${widthPixels}px`}
              : {bottom: `${lowerPixels}px`, height: `${widthPixels}px`}
            const divTextContent = computeTextContent(value)
            return (
              <div key={`count-instance-${i}`} className={className} style={style}>
                {divTextContent}
              </div>
            )
          })
        }
      </>
    )
  }, [computeTextContent, countAdornmentValues?.numHorizontalRegions, countAdornmentValues?.values,
            isBinnedPlot, plotWidth, primaryAttrRole, xScale, yScale])

  useEffect(function resizeTextOnCellWidthChange() {
    return mstAutorun(() => {
      resizeText()
      prevCellWidth.current = plotWidth
    }, { name: "CountAdornmentComponent.resizeTextOnCellWidthChange" }, model)
  }, [model, plotWidth, resizeText])

  useEffect(function respondToAxisDomainChange() {
    return mstReaction(
      () => isNumericAxisModel(primaryAxisModel) ? primaryAxisModel?.domain.slice() : null,
      () => {
        forceUpdate()
      }, { name: "CountAdornment.respondToAxisDomainChange", equals: comparer.structural }, model
    )
  }, [forceUpdate, model, primaryAxisModel, primaryScale])

    useEffect(function resizeTextOnBinWidthChange() {
      return mstReaction(
        () => {
          const binnedDotPlot = isBinnedDotPlotModel(graphModel.plot) && graphModel.plot
          return binnedDotPlot && binnedDotPlot?.binWidth
        },
        () => {
          resizeText()
        }, { name: "CountAdornment.resizeTextOnBinWidthChange" }, graphModel
      )
    }, [graphModel, resizeText])

    useEffect(function refreshShowPercentOption() {
      return mstAutorun(
        () => {
          // set showPercent to false if things change to a configuration that doesn't support percent
          const shouldShowPercentOption = !!dataConfig?.categoricalAttrCount ||
            adornmentsStore.subPlotsHaveRegions || showMeasuresForSelection || movableValuesAreShowing ||
            isBinnedPlot
          if (!shouldShowPercentOption && model?.showPercent) {
            graphModel.applyModelChange(() => {
              model.setShowPercent(false)
            }, {
              undoStringKey: "DG.Undo.graph.hidePercent",
              redoStringKey: "DG.Redo.graph.hidePercent",
              log: "Hide percent adornment"
            })
          }
       }, { name: "CountAdornment.refreshPercentOption"}, model)
    }, [adornmentsStore, dataConfig, graphModel, isBinnedPlot, model, movableValuesAreShowing,
              showMeasuresForSelection])

  return (
    <div
      className="graph-count"
      data-testid={`graph-count${classFromKey ? `-${classFromKey}` : ""}`}
      style={{fontSize: `${fontSize}px`}}
    >
      {divsToDisplay()}
    </div>
  )
})
