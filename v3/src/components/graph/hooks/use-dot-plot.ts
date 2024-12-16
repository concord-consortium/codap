import { useCallback } from "react"
import { ScaleBand, ScaleLinear } from "d3"
import { useMemo } from "use-memo-one"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { computePrimaryCoord, determineBinForCase, adjustCoordForStacks,
         computeBinPlacements, computeSecondaryCoord} from "../utilities/dot-plot-utils"
import { useGraphContentModelContext } from "./use-graph-content-model-context"
import { useGraphDataConfigurationContext } from "./use-graph-data-configuration-context"
import { useGraphLayoutContext } from "./use-graph-layout-context"
import { AxisPlace } from "../../axis/axis-types"
import { GraphAttrRole } from "../../data-display/data-display-types"
import { setPointSelection } from "../../data-display/data-display-utils"
import { dataDisplayGetNumericValue } from "../../data-display/data-display-value-utils"
import { useDataDisplayAnimation } from "../../data-display/hooks/use-data-display-animation"
import { SubPlotCells } from "../models/sub-plot-cells"
import { PixiPoints } from "../../data-display/pixi/pixi-points"

export const useDotPlot = (pixiPoints?: PixiPoints) => {
  const graphModel = useGraphContentModelContext()
  const isHistogram = graphModel.pointDisplayType === "histogram"
  const dataConfig = useGraphDataConfigurationContext()
  const dataset = useDataSetContext()
  const layout = useGraphLayoutContext()
  const subPlotCells = useMemo(() => new SubPlotCells(layout, dataConfig), [dataConfig, layout])
  const { secondaryNumericScale } = subPlotCells
  const primaryAttrRole = dataConfig?.primaryRole ?? "x"
  const primaryIsBottom = primaryAttrRole === "x"
  const secondaryPlace = primaryIsBottom ? "left" : "top"
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
  const numExtraPrimaryBands = Math.max(1, extraPrimaryAxisScale?.domain().length ?? 1)
  const extraSecondaryRole = primaryIsBottom ? "rightSplit" : "topSplit"
  const extraSecondaryAttrID = dataConfig?.attributeID(extraSecondaryRole) ?? ""
  const primaryAttrID = dataConfig?.attributeID(primaryAttrRole) ?? ""
  const primaryPlace: AxisPlace = primaryIsBottom ? "bottom" : "left"
  const primaryAxisScale = layout.getAxisScale(primaryPlace) as ScaleLinear<number, number>
  const pointDiameter = 2 * graphModel.getPointRadius()
  const secondaryAttrID = dataConfig?.attributeID(secondaryAttrRole) ?? ""
  const secondaryAxisScale = layout.getAxisScale(secondaryPlace) as ScaleBand<string>
  const extraSecondaryPlace = primaryIsBottom ? "rightCat" : "top"
  const extraSecondaryAxisScale = layout.getAxisScale(extraSecondaryPlace) as ScaleBand<string>
  const secondaryAxisExtent = Math.abs(Number(secondaryAxisScale.range()[0] - secondaryAxisScale.range()[1]))
  const fullSecondaryBandwidth = secondaryAxisScale.bandwidth?.() ?? secondaryAxisExtent
  const numExtraSecondaryBands = Math.max(1, extraSecondaryAxisScale?.domain().length ?? 1)
  const secondaryBandwidth = fullSecondaryBandwidth / numExtraSecondaryBands
  const extraSecondaryBandwidth = (extraSecondaryAxisScale.bandwidth?.() ?? secondaryAxisExtent)
  const { binWidth, minBinEdge, totalNumberOfBins } = graphModel.binDetails()
  const binPlacementProps = {
    binWidth, dataConfig, dataset, extraPrimaryAttrID, extraSecondaryAttrID, layout, minBinEdge,
    numExtraPrimaryBands, pointDiameter, primaryAttrID, primaryAxisScale, primaryPlace, secondaryAttrID,
    secondaryBandwidth, totalNumberOfBins
  }
  const { bins, binMap } = computeBinPlacements(binPlacementProps)
  const overlap = 0
  const secondaryRangeIndex = primaryIsBottom ? 0 : 1
  const secondaryMax = Number(secondaryAxisScale.range()[secondaryRangeIndex])
  const secondarySign = primaryIsBottom ? -1 : 1
  const baseCoord = primaryIsBottom ? secondaryMax : 0
  const {pointColor, pointStrokeColor} = graphModel.pointDescription
  const pointDisplayType = graphModel.pointDisplayType
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
      anID, binWidth, dataset, extraPrimaryAttrID, extraPrimaryAxisScale, isBinned: true, minBinEdge,
      numExtraPrimaryBands, primaryAttrID, primaryAxisScale, totalNumberOfBins
    }
    const { primaryCoord, extraPrimaryCoord } = computePrimaryCoord(computePrimaryCoordProps)
    let primaryScreenCoord = primaryCoord + extraPrimaryCoord

    if (binWidth !== undefined && graphModel.pointDisplayType !== "histogram") {
      const caseValue = dataDisplayGetNumericValue(dataset, anID, primaryAttrID) ?? -1
      const binForCase = determineBinForCase(caseValue, binWidth, minBinEdge)
      primaryScreenCoord = adjustCoordForStacks({
        anID, axisType: "primary", binForCase, binMap, bins, pointDiameter, secondaryBandwidth,
        screenCoord: primaryScreenCoord, primaryIsBottom
      })
    }

    return primaryScreenCoord
  }, [binMap, binWidth, bins, dataset, extraPrimaryAttrID, extraPrimaryAxisScale, graphModel.pointDisplayType,
      minBinEdge, numExtraPrimaryBands, pointDiameter, primaryAttrID, primaryAxisScale, primaryIsBottom,
      secondaryBandwidth, totalNumberOfBins])

  const getSecondaryScreenCoord = useCallback((anID: string) => {
    if (!binMap[anID]) return 0

    const { category: secondaryCat, extraCategory: extraSecondaryCat, indexInBin } = binMap[anID]
    const secondaryCoordProps = {
      baseCoord, dataConfig, extraSecondaryAxisScale, extraSecondaryBandwidth, extraSecondaryCat, indexInBin, layout,
      numExtraSecondaryBands, overlap, pointDiameter, primaryIsBottom, secondaryAxisExtent, secondaryNumericScale,
      secondaryAxisScale, secondaryBandwidth, secondaryCat, secondarySign, isHistogram
    }
    let secondaryScreenCoord = computeSecondaryCoord(secondaryCoordProps)

    if (binWidth !== undefined && graphModel.pointDisplayType !== "histogram") {
      const onePixelOffset = primaryIsBottom ? -1 : 1
      const casePrimaryValue = dataDisplayGetNumericValue(dataset, anID, primaryAttrID) ?? -1
      const binForCase = determineBinForCase(casePrimaryValue, binWidth, minBinEdge)
      secondaryScreenCoord = adjustCoordForStacks({
        anID, axisType: "secondary", binForCase, binMap, bins, pointDiameter, secondaryBandwidth,
        screenCoord: secondaryScreenCoord, primaryIsBottom
      }) + onePixelOffset
    }
    return secondaryScreenCoord
  }, [binMap, baseCoord, dataConfig, extraSecondaryAxisScale, extraSecondaryBandwidth, layout, numExtraSecondaryBands,
      pointDiameter, primaryIsBottom, secondaryAxisExtent, secondaryNumericScale, secondaryAxisScale,
      secondaryBandwidth, secondarySign, isHistogram, graphModel.pointDisplayType, dataset, primaryAttrID, binWidth,
      minBinEdge, bins])

  return {
    dataset, dataConfig, getPrimaryScreenCoord, getSecondaryScreenCoord, graphModel, isAnimating, layout, pointColor,
    pointDisplayType, pointStrokeColor, primaryAttrRole, primaryAxisScale, primaryIsBottom, primaryPlace,
    refreshPointSelection, secondaryAttrRole, subPlotCells
  }
}
