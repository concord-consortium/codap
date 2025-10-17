import { ScaleBand } from "d3"
import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { useCurrent } from "../../../../hooks/use-current"
import { IBarCover, IPlotProps } from "../../graphing-types"
import { useBinnedPlotResponders } from "../../hooks/use-binned-plot-responders"
import { useDotPlot } from "../../hooks/use-dot-plot"
import { usePlotResponders } from "../../hooks/use-plot"
import { isBinnedPlotModel } from "./histogram-model"
import { SubPlotCells } from "../../models/sub-plot-cells"
import { setPointCoordinates } from "../../utilities/graph-utils"
import { usePrevious } from "../../hooks/use-previous"
import { renderBarCovers } from "../bar-utils"
import { computeBinPlacements } from "../dot-plot/dot-plot-utils"

export const Histogram = observer(function Histogram({ abovePointsGroupRef, pixiPoints }: IPlotProps) {
  const { dataset, dataConfig, graphModel, isAnimating, layout, getPrimaryScreenCoord, getSecondaryScreenCoord,
          pointColor, pointStrokeColor, primaryAttrRole, primaryAxisScale, primaryIsBottom, primaryPlace,
          refreshPointSelection, secondaryAttrRole } = useDotPlot(pixiPoints)
  const binnedPlot = isBinnedPlotModel(graphModel.plot) ? graphModel.plot : undefined
  const barCoversRef = useRef<SVGGElement>(null)

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    if (!dataConfig) return

    const secondaryPlace = primaryIsBottom ? "left" : "bottom",
      extraPrimaryPlace = primaryIsBottom ? "top" : "rightCat",
      extraPrimaryRole = primaryIsBottom ? "topSplit" : "rightSplit",
      extraSecondaryPlace = primaryIsBottom ? "rightCat" : "top",
      extraSecondaryRole = primaryIsBottom ? "rightSplit" : "topSplit",
      extraPrimaryAxisScale = layout.getAxisScale(extraPrimaryPlace) as ScaleBand<string>,
      secondaryAxisScale = layout.getAxisScale(secondaryPlace) as ScaleBand<string>,
      extraSecondaryAxisScale = layout.getAxisScale(extraSecondaryPlace) as ScaleBand<string>,
      primaryAttrID = dataConfig?.attributeID(primaryAttrRole) ?? "",
      extraPrimaryAttrID = dataConfig?.attributeID(extraPrimaryRole) ?? "",
      numExtraPrimaryBands = Math.max(1, extraPrimaryAxisScale?.domain().length ?? 1),
      pointDiameter = 2 * graphModel.getPointRadius(),
      secondaryAttrID = dataConfig?.attributeID(secondaryAttrRole) ?? "",
      extraSecondaryAttrID = dataConfig?.attributeID(extraSecondaryRole) ?? "",
      secondaryAxisExtent = Math.abs(Number(secondaryAxisScale.range()[0] - secondaryAxisScale.range()[1])),
      fullSecondaryBandwidth = secondaryAxisScale.bandwidth?.() ?? secondaryAxisExtent,
      numExtraSecondaryBands = Math.max(1, extraSecondaryAxisScale?.domain().length ?? 1),
      secondaryBandwidth = fullSecondaryBandwidth / numExtraSecondaryBands,
      { binWidth, minBinEdge, totalNumberOfBins } = binnedPlot?.binDetails() || {},
      subPlotCells = new SubPlotCells(layout, dataConfig),
      { secondaryNumericUnitLength } = subPlotCells

    const binPlacementProps = {
      binWidth, dataConfig, dataset, extraPrimaryAttrID, extraSecondaryAttrID, layout, minBinEdge,
      numExtraPrimaryBands, pointDiameter, primaryAttrID, primaryAxisScale, primaryPlace, secondaryAttrID,
      secondaryBandwidth, totalNumberOfBins
    }
    if (binWidth === undefined) return

    const { bins } = computeBinPlacements(binPlacementProps)
    const primaryScaleDiff = primaryAxisScale(binWidth) - primaryAxisScale(0)
    const getWidth = () => primaryIsBottom ? primaryScaleDiff / numExtraPrimaryBands : secondaryNumericUnitLength
    const getHeight = () => primaryIsBottom ? secondaryNumericUnitLength : -primaryScaleDiff / numExtraPrimaryBands
    const getScreenX = primaryIsBottom ? getPrimaryScreenCoord : getSecondaryScreenCoord
    const getScreenY = primaryIsBottom ? getSecondaryScreenCoord : getPrimaryScreenCoord
    const getLegendColor = dataConfig?.attributeID("legend") ? dataConfig?.getLegendColorForCase : undefined

    // build and render bar cover elements that will handle click events for the fused points
    if (dataConfig && abovePointsGroupRef?.current) {
      const uniqueBarCovers = new Map<string, IBarCover>()
      Object.keys(bins).forEach(primeCat => {
        Object.keys(bins[primeCat]).forEach(secCat => {
          Object.keys(bins[primeCat][secCat]).forEach(primeSplitCat => {
            Object.keys(bins[primeCat][secCat][primeSplitCat]).forEach(secSplitCat => {
              const cellData = bins[primeCat][secCat][primeSplitCat]
              cellData.forEach((cell, cellIndex) => {
                if (cell.length === 0) return
                const barSecondaryDimension = secondaryNumericUnitLength * cell.length
                const barWidth = primaryIsBottom
                                   ? primaryScaleDiff / numExtraPrimaryBands
                                   : barSecondaryDimension
                const barHeight = primaryIsBottom
                                    ? barSecondaryDimension
                                    : -primaryScaleDiff / numExtraPrimaryBands
                const x = primaryIsBottom
                            ? getPrimaryScreenCoord(cell[0]) - barWidth / 2
                            : getSecondaryScreenCoord(cell[0]) - secondaryNumericUnitLength / 2
                const y = primaryIsBottom
                            ? getSecondaryScreenCoord(cell[0]) - barHeight + secondaryNumericUnitLength / 2
                            : getPrimaryScreenCoord(cell[0]) - barHeight / 2
                const key = `${primeCat}-${secCat}-${primeSplitCat}-${cellIndex}`
                const cover = {
                  caseIDs: cell,
                  class: `bar-cover bar-cover-${cellIndex} draggable-bin-boundary`,
                  primeCat, secCat, primeSplitCat, secSplitCat,
                  x: x.toString(), y: y.toString(),
                  width: barWidth.toString(), height: barHeight.toString()
                }
                if (!uniqueBarCovers.has(key)) uniqueBarCovers.set(key, cover)
              })
            })
          })
        })
      })
      const barCovers: IBarCover[] = Array.from(uniqueBarCovers.entries()).map(([_, cover]) => cover)
      renderBarCovers({ barCovers, barCoversRef, graphModel, primaryAttrRole })
    }

    setPointCoordinates({
      pointRadius: graphModel.getPointRadius(),
      selectedPointRadius: graphModel.getPointRadius("select"),
      pixiPoints, selectedOnly, pointColor, pointStrokeColor, getWidth, getHeight,
      getScreenX, getScreenY, getLegendColor, getAnimationEnabled: isAnimating,
      pointDisplayType: "bars", dataset, pointsFusedIntoBars: true
    })
  }, [abovePointsGroupRef, binnedPlot, dataConfig, dataset, getPrimaryScreenCoord, getSecondaryScreenCoord,
      graphModel, isAnimating, layout, pixiPoints, pointColor, pointStrokeColor,
      primaryAttrRole, primaryAxisScale, primaryIsBottom, primaryPlace, secondaryAttrRole])
  const prevRefreshPointPosition = usePrevious(refreshPointPositions)
  const refreshPointPositionsRef = useCurrent(refreshPointPositions)
  if (prevRefreshPointPosition !== refreshPointPositionsRef.current) {
  }

  usePlotResponders({pixiPoints, refreshPointPositions, refreshPointSelection})
  useBinnedPlotResponders(refreshPointPositionsRef)

  // when points are fused into bars, update pixiPoints and set the secondary axis scale type to linear
  useEffect(function handleFuseIntoBars() {
    return mstAutorun(
      () => {
        if (pixiPoints) {
          pixiPoints.pointsFusedIntoBars = graphModel.pointsFusedIntoBars
        }
        if (graphModel.pointsFusedIntoBars) {
          const secondaryRole = graphModel.dataConfiguration.primaryRole === "x" ? "y" : "x"
          const secondaryPlace = secondaryRole === "y" ? "left" : "bottom"
          layout.setAxisScaleType(secondaryPlace, "linear")
        }
      },
      {name: "useAxis [handleFuseIntoBars]"}, graphModel
    )
  }, [graphModel, layout, pixiPoints])

  return (
    <>
      {abovePointsGroupRef?.current && createPortal(
        <g ref={barCoversRef}/>,
        abovePointsGroupRef.current
      )}
    </>
  )
})
