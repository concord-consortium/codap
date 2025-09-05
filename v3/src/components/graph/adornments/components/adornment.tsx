import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React from "react"
import { useDeepCompareMemo } from "use-deep-compare"
import { transitionDuration } from "../../../data-display/data-display-types"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { useSubplotExtent } from "../../hooks/use-subplot-extent"
import { getAdornmentComponentInfo } from "../adornment-component-info"
import { IAdornmentModel } from "../adornment-models"

import "./adornment.scss"

interface IProps {
  adornment: IAdornmentModel
  cellKey: Record<string, string>
  cellCoords: { row: number, col: number }
  labelsDivRef: React.RefObject<HTMLDivElement>
  spannerRef: React.RefObject<SVGSVGElement>
}

export const Adornment = observer(function Adornment({adornment, cellKey: _cellKey,
                                                       cellCoords, labelsDivRef, spannerRef}: IProps) {
  const cellKey = useDeepCompareMemo(() => _cellKey, [_cellKey])
  const graphModel = useGraphContentModelContext()
  const { subPlotWidth, subPlotHeight } = useSubplotExtent()
  const classFromCellKey = adornment.classNameFromKey(cellKey)
  // The adornmentKey is a unique value used for React's key prop and for the adornment wrapper's HTML ID.
  // We can't use the cellKey because that value may be duplicated if there are multiple types of
  // adornments active on the graph.
  const adornmentKey = `${adornment.id}${classFromCellKey ? `-${classFromCellKey}` : ''}`
  const componentInfo = getAdornmentComponentInfo(adornment.type)
  if (!componentInfo) return null
  const { Component } = componentInfo

  const adornmentWrapperClass = clsx(
    "adornment-wrapper",
    `${adornmentKey}-wrapper`,
    classFromCellKey,
    {
      "visible": adornment.isVisible,
      "hidden": !adornment.isVisible
    }
  )

  return (
    <div
      id={adornmentKey}
      className={adornmentWrapperClass}
      style={{animationDuration: `${transitionDuration}ms`}}
      data-testid={"adornment-wrapper"}
    >
      <Component
        cellKey={cellKey}
        cellCoords={cellCoords}
        containerId={adornmentKey}
        key={adornmentKey}
        model={adornment}
        plotHeight={subPlotHeight}
        plotWidth={subPlotWidth}
        xAxis={graphModel.getNumericAxis('bottom')}
        yAxis={graphModel.getNumericAxis('left')}
        labelsDivRef={labelsDivRef}
        spannerRef={spannerRef}
      />
    </div>
  )
})
