import React, { useEffect, useRef } from "react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { IAdornmentModel } from "./adornment-models"
import { useGraphLayoutContext } from "../models/graph-layout"
import {useGraphContentModelContext} from "../models/graph-content-model"
import { INumericAxisModel } from "../../axis/models/axis-model"
import { getAdornmentComponentInfo } from "./adornment-component-info"
import {transitionDuration} from "../../data-display/data-display-types"

import "./adornment.scss"

interface IProps {
  adornment: IAdornmentModel,
  index: number,
  xCategories: string[] | number[],
  yCategories: string[] | number[]
}

export const Adornment = observer(function Adornment({ adornment, index, xCategories, yCategories}: IProps) {
  const graphModel = useGraphContentModelContext(),
    layout = useGraphLayoutContext(),
    subPlotWidth = xCategories.length > 0
                     ? layout.plotWidth / xCategories.length
                     : layout.plotWidth,
    subPlotHeight = yCategories.length > 0
                      ? layout.plotHeight / yCategories.length
                      : layout.plotHeight,
    isFadeInComplete = useRef(false),
    isFadeOutComplete = useRef(false)

  useEffect(function fadeInCleanup() {
    isFadeInComplete.current = adornment.isVisible
    isFadeOutComplete.current = !adornment.isVisible
  }, [adornment.isVisible])

  // The instanceKey is used by the adornment model to uniquely identify an instance of the adornment in its
  // map of instances. If there is only one instance of the adornment, the instanceKey is an empty string.
  const instanceKey = adornment.instanceKey(xCategories, yCategories, index) ?? ''
  const classFromKey = adornment.classNameFromKey(instanceKey)
  // The adornmentKey is a unique value used for React's key prop and for the adornment wrapper's HTML ID.
  // We can't use the instanceKey because that value may be duplicated if there are multiple types of
  // adornments active on the graph.
  const adornmentKey = `${adornment.id}${instanceKey ? `-${classFromKey}` : ''}`
  const componentInfo = getAdornmentComponentInfo(adornment.type)
  if (!componentInfo) return null
  const { Component } = componentInfo

  const adornmentWrapperClass = clsx(
    'adornment-wrapper',
    `${adornmentKey}-wrapper`,
    {
      'fadeIn': adornment.isVisible && !isFadeInComplete.current,
      'fadeOut': !adornment.isVisible && !isFadeOutComplete.current,
      'hidden': !adornment.isVisible && isFadeOutComplete.current
    }
  )

  return (
    <div
      id={adornmentKey}
      className={adornmentWrapperClass}
      style={{animationDuration: `${transitionDuration}ms`}}
      data-testid={'adornment-wrapper'}
    >
      <Component
        containerId={adornmentKey}
        key={adornmentKey}
        instanceKey={instanceKey}
        model={adornment}
        plotHeight={subPlotHeight}
        plotIndex={index}
        plotWidth={subPlotWidth}
        xAxis={graphModel.getAxis('bottom') as INumericAxisModel}
        yAxis={graphModel.getAxis('left') as INumericAxisModel}
      />
    </div>
  )
})
