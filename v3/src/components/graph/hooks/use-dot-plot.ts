import { ScaleBand, ScaleLinear } from "d3"
import { reaction } from "mobx"
import { useCallback, useEffect } from "react"
import { useMemo } from "use-memo-one"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { AxisPlace } from "../../axis/axis-types"
import { GraphAttrRole } from "../../data-display/data-display-types"
import { setPointSelection } from "../../data-display/data-display-utils"
import { dataDisplayGetNumericValue } from "../../data-display/data-display-value-utils"
import { useDataDisplayAnimation } from "../../data-display/hooks/use-data-display-animation"
import { PixiPoints } from "../../data-display/pixi/pixi-points"
import { isBinnedPlotModel } from "../plots/histogram/histogram-model"
import { SubPlotCells } from "../models/sub-plot-cells"
import { kEmptyBinDetails } from "../plots/binned-dot-plot/bin-details"
import {
  computePrimaryCoord, adjustCoordForStacks, computeBinPlacements, computeSecondaryCoord
} from "../plots/dot-plot/dot-plot-utils"
import { useGraphContentModelContext } from "./use-graph-content-model-context"
import { useGraphDataConfigurationContext } from "./use-graph-data-configuration-context"
import { useGraphLayoutContext } from "./use-graph-layout-context"

export const useDotPlot = (pixiPoints?: PixiPoints) => {
  const graphModel = useGraphContentModelContext()
  const isHistogram = graphModel.plotType === "histogram"
  const dataConfig = useGraphDataConfigurationContext()
  const dataset = useDataSetContext()
  const layout = useGraphLayoutContext()
  const subPlotCells = useMemo(() => new SubPlotCells(layout, dataConfig), [dataConfig, layout])
  const { secondaryNumericScale } = subPlotCells
  const primaryAttrRole = dataConfig?.primaryRole ?? "x"
  const primaryIsBottom = primaryAttrRole === "x"
  const secondaryPlace = primaryIsBottom ? "left" : "bottom"
  const secondaryAttrRole: GraphAttrRole = primaryAttrRole === "x" ? "y" : "x"
  const extraPrimaryRole = primaryIsBottom ? "topSplit" : "rightSplit"
  const extraPrimaryPlace = primaryIsBottom ? "top" : "rightCat"
  const extraPrimaryAttrID = dataConfig?.attributeID(extraPrimaryRole) ?? ""
  // TODO: Instead of using `layout.getAxisScale` and casting to `ScaleBand<string>` to set
  // `extraPrimaryAxisScale`, `secondaryAxisScale`, and `extraSecondaryAxisScale` below, we should use
  // `layout.getBandScale`. We're not doing so now because using `layout.getBandScale` here breaks things in
  // strange ways. It's possibly related to the fact `getBandScale` can return `undefined` whereas `getAxisScale`
  // will always return a scale of some kind.
  const extraPrimaryAxisScale = layout.getAxisScale(extraPrimaryPlace) as ScaleBand<string>
  const primaryPlace: AxisPlace = primaryIsBottom ? "bottom" : "left"
  const numExtraPrimaryBands = dataConfig?.numRepetitionsForPlace(primaryPlace) ?? 1
  const extraSecondaryRole = primaryIsBottom ? "rightSplit" : "topSplit"
  const extraSecondaryAttrID = dataConfig?.attributeID(extraSecondaryRole) ?? ""
  const primaryAttrID = dataConfig?.attributeID(primaryAttrRole) ?? ""
  const primaryAxisScale = layout.getAxisScale(primaryPlace) as ScaleLinear<number, number>
  const pointDiameter = 2 * graphModel.getPointRadius()
  const secondaryAttrID = dataConfig?.attributeID(secondaryAttrRole) ?? ""
  const secondaryAxisScale = layout.getAxisScale(secondaryPlace) as ScaleBand<string>
  const extraSecondaryPlace = primaryIsBottom ? "rightCat" : "top"
  const extraSecondaryAxisScale = layout.getAxisScale(extraSecondaryPlace) as ScaleBand<string>
  const secondaryAxisExtent = layout.getAxisLength(secondaryPlace)
  const fullSecondaryBandwidth = secondaryAxisScale.bandwidth?.() ?? secondaryAxisExtent
  const numExtraSecondaryBands = Math.max(1, extraSecondaryAxisScale?.domain().length ?? 1)
  const secondaryBandwidth = fullSecondaryBandwidth / numExtraSecondaryBands
  const extraSecondaryBandwidth = (extraSecondaryAxisScale.bandwidth?.() ?? secondaryAxisExtent)
  const binDetails = dataConfig && isBinnedPlotModel(graphModel.plot)
                      ? graphModel.plot.binDetails()
                      : kEmptyBinDetails
  const binPlacementProps = {
    binDetails, dataConfig, dataset, extraPrimaryAttrID, extraSecondaryAttrID, layout, numExtraPrimaryBands,
    pointDiameter, primaryAttrID, primaryAxisScale, primaryPlace, secondaryAttrID, secondaryBandwidth
  }
  const { bins, binMap, overlap, numPointsInRow } = computeBinPlacements(binPlacementProps)
  const secondaryRangeIndex = primaryIsBottom ? 0 : 1
  const secondaryMax = Number(secondaryAxisScale.range()[secondaryRangeIndex])
  const secondarySign = primaryIsBottom ? -1 : 1
  const baseCoord = primaryIsBottom ? secondaryMax : 0
  const {pointColor, pointStrokeColor} = graphModel.pointDescription
  const pointDisplayType = graphModel.plot.displayType
  const { isAnimating } = useDataDisplayAnimation()

  const refreshPointSelection = useCallback(() => {
    const pointRadius = graphModel.getPointRadius()
    const selectedPointRadius = graphModel.getPointRadius('select')
    const pointsFusedIntoBars = graphModel.pointsFusedIntoBars
    dataConfig && setPointSelection({
      pixiPoints, dataConfiguration: dataConfig, pointRadius, pointColor, pointStrokeColor, selectedPointRadius,
      pointDisplayType, pointsFusedIntoBars
    })
  }, [dataConfig, graphModel, pixiPoints, pointColor, pointStrokeColor, pointDisplayType])

  const getPrimaryScreenCoord = useCallback((anID: string) => {
    const computePrimaryCoordProps = {
      anID, binDetails, dataset, extraPrimaryAttrID, extraPrimaryAxisScale, isBinned: true,
      numExtraPrimaryBands, primaryAttrID, primaryAxisScale
    }
    const { primaryCoord, extraPrimaryCoord } = computePrimaryCoord(computePrimaryCoordProps)
    let primaryScreenCoord = primaryCoord + extraPrimaryCoord

    if (binDetails.binWidth && !isHistogram) {
      const { indexInBin } = binMap[anID] || {}
      const caseValue = dataDisplayGetNumericValue(dataset, anID, primaryAttrID) ?? -1
      const binForCase = binDetails.getBinForValue(caseValue) ?? 0
      primaryScreenCoord = adjustCoordForStacks({
        anID, axisType: "primary", binForCase, binMap, bins, pointDiameter, secondaryBandwidth,
        screenCoord: primaryScreenCoord, primaryIsBottom, indexInBin, numPointsInRow
      })
    }

    return primaryScreenCoord
  }, [binDetails, binMap, bins, dataset, extraPrimaryAttrID, extraPrimaryAxisScale, isHistogram,
      numExtraPrimaryBands, pointDiameter, primaryAttrID, primaryAxisScale, primaryIsBottom,
      secondaryBandwidth, numPointsInRow])

  const getSecondaryScreenCoord = useCallback((anID: string) => {
    if (!binMap[anID]) return 0

    const { category: secondaryCat, extraCategory: extraSecondaryCat, indexInBin } = binMap[anID]
    const secondaryCoordProps = {
      baseCoord, dataConfig, extraSecondaryAxisScale, extraSecondaryBandwidth, extraSecondaryCat, indexInBin, layout,
      numExtraSecondaryBands, overlap, numPointsInRow, pointDiameter, primaryIsBottom, secondaryAxisExtent,
      secondaryNumericScale, secondaryAxisScale, secondaryBandwidth, secondaryCat, secondarySign, isHistogram
    }
    let secondaryScreenCoord = computeSecondaryCoord(secondaryCoordProps)

    if (binDetails?.binWidth && !isHistogram) {
      secondaryScreenCoord += primaryIsBottom ? -1 : 1
    }
    return secondaryScreenCoord
  }, [baseCoord, binDetails, binMap, dataConfig, extraSecondaryAxisScale, extraSecondaryBandwidth,
      isHistogram, layout, numExtraSecondaryBands, numPointsInRow, overlap, pointDiameter,
      primaryIsBottom, secondaryAxisExtent, secondaryAxisScale, secondaryBandwidth,
      secondaryNumericScale, secondarySign])

  useEffect(function handleSecondaryAxisScaleChange() {
    return reaction(
      () => layout?.axisScales.get(secondaryPlace),
      axisScale => {
        axisScale?.setCategoricalDomain(dataConfig?.categoryArrayForAttrRole(secondaryAttrRole) ?? [])
      },
      {name: 'AxisScale updateCategoricalDomain', fireImmediately: true}
    )
  }, [dataConfig, layout, secondaryAttrRole, secondaryPlace])

  return {
    dataset, dataConfig, getPrimaryScreenCoord, getSecondaryScreenCoord, graphModel, isAnimating, layout, pointColor,
    pointDisplayType, pointStrokeColor, primaryAttrRole, primaryAxisScale, primaryIsBottom, primaryPlace,
    refreshPointSelection, secondaryAttrRole, subPlotCells
  }
}
