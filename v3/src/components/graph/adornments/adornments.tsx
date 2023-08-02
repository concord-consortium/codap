import React from "react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { kGraphAdornmentsClass } from "../graphing-types"
import { useGraphLayoutContext } from "../models/graph-layout"
import { Adornment } from "./adornment"
import { getAdornmentContentInfo } from "./adornment-content-info"
import { IAdornmentModel } from "./adornment-models"
import { useInstanceIdContext } from "../../../hooks/use-instance-id-context"
import { useTileModelContext } from "../../../hooks/use-tile-model-context"
import { useGraphContentModelContext } from "../hooks/use-graph-content-model-context"

import "./adornments.scss"

export const Adornments = observer(function Adornments() {
  const graphModel = useGraphContentModelContext(),
    instanceId = useInstanceIdContext(),
    layout = useGraphLayoutContext(),
    { isTileSelected } = useTileModelContext(),
    adornments = graphModel.adornments

  if (!adornments?.length) return null

  // When a graph contains multiple sub-plots, each adornment needs to be rendered once
  // per sub-plot. We create a CSS grid in which to place the adornments, with each cell
  // of the grid corresponding to one sub-plot.
  const
    xCategories = graphModel.dataConfiguration.categoryArrayForAttrRole("topSplit", []),
    yCategories = graphModel.dataConfiguration.categoryArrayForAttrRole("rightSplit", []),
    colCount = xCategories.length,
    rowCount = yCategories.length,
    { left, top, width, height } = layout.computedBounds.plot,
    cellsRequired = Math.max(1, colCount) * Math.max(1, rowCount),
    gridTemplateColumns = `repeat(${colCount}, 1fr)`,
    gridTemplateRows = `repeat(${rowCount}, 1fr)`,
    gridStyle = {
      gridTemplateColumns,
      gridTemplateRows,
      height,
      left,
      top,
      width,
    }
  let cellsRendered = 0

  const adornmentNodes = []
  while (cellsRendered < cellsRequired) {
    adornmentNodes.push(
      <div
        key={`${kGraphAdornmentsClass}-${cellsRendered}`}
        className={`${kGraphAdornmentsClass}__cell`}
        data-testid={`${kGraphAdornmentsClass}__cell`}
      >
        {
          adornments.map((adornment: IAdornmentModel) => {
            // skip adornments that don't support current plot type
            const adornmentContentInfo = getAdornmentContentInfo(adornment.type)
            if (!adornmentContentInfo.plots.includes(graphModel.plotType)) return

            return <Adornment
                     key={`graph-adornment-${adornment.id}-${cellsRendered}`}
                     adornment={adornment}
                     index={cellsRendered}
                     xCategories={xCategories}
                     yCategories={yCategories}
                   />
          })
        }
      </div>
    )
    cellsRendered++
  }

  const containerClass = clsx(
    `${kGraphAdornmentsClass} ${instanceId}`,
    { 'tile-selected': isTileSelected() }
  )
  return (
    <div className={containerClass} data-testid={kGraphAdornmentsClass} style={gridStyle}>
      {adornmentNodes}
    </div>
  )
})
