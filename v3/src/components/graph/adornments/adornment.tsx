import React from "react"
import { IAdornmentModel } from "./adornment-models"
import { useGraphLayoutContext } from "../models/graph-layout"
import { useGraphModelContext } from "../models/graph-model"
import { INumericAxisModel } from "../../axis/models/axis-model"
import { getAdornmentComponentInfo } from "./adornment-component-info"

interface IProps {
  adornment: IAdornmentModel,
  index: number,
  xCategories: string[] | number[],
  yCategories: string[] | number[]
}

export const Adornment = ({ adornment, index, xCategories, yCategories}: IProps) => {
  const graphModel = useGraphModelContext(),
    layout = useGraphLayoutContext(),
    subPlotWidth = xCategories.length > 0
                     ? layout.plotWidth / xCategories.length
                     : layout.plotWidth,
    subPlotHeight = yCategories.length > 0
                      ? layout.plotHeight / yCategories.length
                      : layout.plotHeight

  // The instanceKey is used by the adornment model to uniquely identify an instance of the adornment in its
  // map of instances. If there is only one instance of the adornment, the instanceKey is an empty string.
  const instanceKey = adornment.setInstanceKey(xCategories, yCategories, index)
  // The adornmentKey is a unique value used for React's key prop. We can't use the instanceKey because that
  // value may be duplicated if there are multiple types of adornments active on the graph.
  const adornmentKey = `${adornment.id}${instanceKey ? `-${instanceKey}` : ''}`
  const componentInfo = getAdornmentComponentInfo(adornment.type)
  if (!componentInfo) return null
  const { Component } = componentInfo
  return (
    <Component
      key={adornmentKey}
      lineKey={instanceKey}
      model={adornment}
      plotHeight={subPlotHeight}
      plotIndex={index}
      plotWidth={subPlotWidth}
      xAxis={graphModel.getAxis('bottom') as INumericAxisModel}
      yAxis={graphModel.getAxis('left') as INumericAxisModel}
    />
  )
}
