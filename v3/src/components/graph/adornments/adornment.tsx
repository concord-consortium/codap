import React from "react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { IAdornmentModel } from "./adornment-models"
import { useGraphContentModelContext } from "../hooks/use-graph-content-model-context"
import { useGraphLayoutContext } from "../hooks/use-graph-layout-context"
import { useGraphDataConfigurationContext } from "../hooks/use-graph-data-configuration-context"
import { INumericAxisModel } from "../../axis/models/axis-model"
import { getAdornmentComponentInfo } from "./adornment-component-info"
import {transitionDuration} from "../../data-display/data-display-types"

import "./adornment.scss"

interface IProps {
  adornment: IAdornmentModel
  cellKey: Record<string, string>
}

export const Adornment = observer(function Adornment({adornment, cellKey}: IProps) {
  const graphModel = useGraphContentModelContext()
  const layout = useGraphLayoutContext()
  const dataConfig = useGraphDataConfigurationContext()
  const numExtraPrimaryBands = dataConfig?.numRepetitionsForPlace("bottom") ?? 1
  const numExtraSecondaryBands = dataConfig?.numRepetitionsForPlace("left") ?? 1
  const subPlotWidth = layout.plotWidth / numExtraPrimaryBands
  const subPlotHeight = layout.plotHeight / numExtraSecondaryBands
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
        containerId={adornmentKey}
        key={adornmentKey}
        model={adornment}
        plotHeight={subPlotHeight}
        plotWidth={subPlotWidth}
        xAxis={graphModel.getAxis('bottom') as INumericAxisModel}
        yAxis={graphModel.getAxis('left') as INumericAxisModel}
      />
    </div>
  )
})
