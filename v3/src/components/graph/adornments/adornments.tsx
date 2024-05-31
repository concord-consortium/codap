import React, { useEffect, useRef } from "react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { mstAutorun } from "../../../utilities/mst-autorun"
import { kGraphAdornmentsClass } from "../graphing-types"
import { Adornment } from "./adornment"
import { getAdornmentContentInfo } from "./adornment-content-info"
import { IAdornmentModel } from "./adornment-models"
import { useInstanceIdContext } from "../../../hooks/use-instance-id-context"
import { useTileModelContext } from "../../../hooks/use-tile-model-context"
import { useGraphContentModelContext } from "../hooks/use-graph-content-model-context"
import { useGraphDataConfigurationContext } from "../hooks/use-graph-data-configuration-context"
import { useGraphLayoutContext } from "../hooks/use-graph-layout-context"
import { getAdornmentComponentInfo } from "./adornment-component-info"
import { updateCellKey } from "./adornment-utils"
import { kGraphAdornmentsBannerHeight } from "./adornment-types"
import { MeasuresForSelectionBanner } from "./measures-for-selection-banner"

import "./adornments.scss"

export const Adornments = observer(function Adornments() {
  const graphModel = useGraphContentModelContext()
  const dataConfig = useGraphDataConfigurationContext()
  const instanceId = useInstanceIdContext()
  const layout = useGraphLayoutContext()
  const { isTileSelected } = useTileModelContext()
  const adornments = graphModel.adornmentsStore.adornments
  const { left, top, width, height } = layout.computedBounds.plot
  const spannerRef = useRef<SVGSVGElement>(null)

  useEffect(function handleAdornmentBannerCountChange() {
    return mstAutorun(() => {
      let bannerCount = graphModel.showMeasuresForSelection ? 1 : 0
      bannerCount += graphModel.adornmentsStore.activeBannerCount
      const bannersHeight = bannerCount * kGraphAdornmentsBannerHeight
      layout.setDesiredExtent("banners", bannersHeight)
      }, { name: "Graph.handleAdornmentBannerCountChange" }, graphModel
    )
  }, [graphModel, layout])

  if (!adornments?.length) return null

  const adornmentBanners = adornments.map((adornment: IAdornmentModel) => {
    const componentContentInfo = getAdornmentContentInfo(adornment.type)
    if (!componentContentInfo?.plots.includes(graphModel.plotType)) return

    const componentInfo = getAdornmentComponentInfo(adornment.type)
    const BannerComponent = componentInfo?.BannerComponent
    return (
      BannerComponent && adornment.isVisible &&
        <BannerComponent key={componentInfo.type} model={adornment} />
    )
  })

  const xAttrId = dataConfig?.attributeID("x")
  const xAttrType = dataConfig?.attributeType("x")
  const xCatValues = layout.getAxisMultiScale('bottom').categoryValues
  const xCats = xAttrType === "categorical" && xCatValues ? xCatValues : [""]
  const yAttrId = dataConfig?.attributeID("y")
  const yAttrType = dataConfig?.attributeType("y")
  const yCatValues = layout.getAxisMultiScale("left").categoryValues
  // yCats is the array of categorical values for the y axis (the one on the left)
  const yCats = yAttrType === "categorical" && yCatValues ? yCatValues : [""]
  const topAttrId = dataConfig?.attributeID("topSplit")
  const topCatValues = layout.getAxisMultiScale("top").categoryValues
  const topCats = topCatValues ?? [""]
  const rightAttrId = dataConfig?.attributeID("rightSplit")
  const rightCatValues = layout.getAxisMultiScale("rightCat").categoryValues
  const rightCats = rightCatValues ?? [""]

  // When a graph contains multiple sub-plots, each adornment needs to be rendered once per sub-plot.
  // For placing the adornments, we build a CSS grid where each cell corresponds to a subplot of the
  // graph. This "outer grid" is determined by the number of repetitions of the bottom and left axes
  // (the number of repetitions is determined by the number of categories in the top and right splits).
  // Inside each cell of the outer grid, we build an "inner grid" which is determined by the attributes
  // on the bottom and left axes.
  const outerGridCells: React.JSX.Element[] = []
  // bottomRepetitions is the number of repetitions of the bottom axis brought about by categories on the top axis
  const bottomRepetitions = dataConfig?.numRepetitionsForPlace('bottom') ?? 1
  // leftRepetitions is the number of repetitions of the left axis brought about by categories on the right axis
  const leftRepetitions = dataConfig?.numRepetitionsForPlace('left') ?? 1
  const outerGridStyle = {
    gridTemplateColumns: `repeat(${bottomRepetitions}, 1fr)`,
    gridTemplateRows: `repeat(${leftRepetitions}, 1fr)`,
    height,
    left,
    top,
    width
  }
  const innerGridStyle = {
    gridTemplateColumns: `repeat(${xCats.length}, 1fr)`,
    gridTemplateRows: `repeat(${yCats.length}, 1fr)`,
  }
  for (let topIndex = 0; topIndex < bottomRepetitions; topIndex++) {
    for (let rightIndex = 0; rightIndex < leftRepetitions; rightIndex++) {
      const adornmentNodes = []
      for (let yIndex = 0; yIndex < yCats.length; yIndex++) {
        for (let xIndex = 0; xIndex < xCats.length; xIndex++) {
          // The cellKey is an object that contains the attribute IDs and categorical values for the
          // current graph cell. It's used to uniquely identify that cell.
          let cellKey: Record<string, string> = {}
          const cellCoords = { row: rightIndex * yCats.length + yIndex,
            col: topIndex * xCats.length + xIndex}
          if (topAttrId) {
            cellKey = updateCellKey(cellKey, topAttrId, topCats[topIndex])
          }
          if (rightAttrId) {
            // invert the rightIndex to match how the graph's y axis is oriented
            const rightIndexInverted = leftRepetitions - rightIndex - 1
            cellKey = updateCellKey(cellKey, rightAttrId, rightCats[rightIndexInverted])
          }
          if (yAttrId) {
            // invert the yIndex to match how the graph's y axis is oriented
            const yIndexInverted = yCats.length - yIndex - 1
            cellKey = updateCellKey(cellKey, yAttrId, yCats[yIndexInverted])
          }
          if (xAttrId) {
            cellKey = updateCellKey(cellKey, xAttrId, xCats[xIndex])
          }
          adornmentNodes.push(
            <div
              key={`${kGraphAdornmentsClass}-${yIndex}-${xIndex}-${rightIndex}-${topIndex}`}
              className={`${kGraphAdornmentsClass}__cell`}
              data-testid={`${kGraphAdornmentsClass}__cell`}
            >
              {
                adornments.map((adornment: IAdornmentModel) => {
                  // skip adornments that don't support current plot type
                  const adornmentContentInfo = getAdornmentContentInfo(adornment.type)
                  if (!adornmentContentInfo.plots.includes(graphModel.plotType)) return
                  return <Adornment
                          key={`graph-adornment-${adornment.id}-${yIndex}-${xIndex}-${rightIndex}-${topIndex}`}
                          adornment={adornment}
                          cellKey={cellKey}
                          cellCoords={cellCoords}
                          spannerRef={spannerRef}
                        />
                })
              }
            </div>
          )
        }
      }

      outerGridCells.push(
        <div className="innerGrid" key={`inner-grid-${topIndex}-${rightIndex}`} style={innerGridStyle}>
          {adornmentNodes}
        </div>
      )
    }
  }

  const containerClass = clsx(
    `${kGraphAdornmentsClass} ${instanceId}`,
    { 'tile-selected': isTileSelected() }
  )
  return (
    <>
      {adornmentBanners &&
        <div className="graph-adornments-banners" data-testid="graph-adornments-banners">
          {graphModel.showMeasuresForSelection && <MeasuresForSelectionBanner />}
          {adornmentBanners}
        </div>
      }
      <div className={containerClass} data-testid={kGraphAdornmentsClass} style={outerGridStyle}>
        {outerGridCells}
      </div>
      <div className={'adornment-spanner'} style={outerGridStyle}>
        {/*The following svg can be used by adornments that need to draw outside their grid cell*/}
        <svg className="spanner-svg" ref={spannerRef}/>
      </div>
    </>
  )
})
