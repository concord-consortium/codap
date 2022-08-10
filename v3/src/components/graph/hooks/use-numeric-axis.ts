import React, {useCallback, useEffect} from "react"
import {reaction} from "mobx"
import {axisBottom, axisLeft, ScaleLinear, select} from "d3"
import {INumericAxisModel} from "../models/axis-model"


export interface IUseNumericAxis {
  axisModel: INumericAxisModel
  scale: ScaleLinear<number, number>
  axisRef:  React.MutableRefObject<any>
}
export const useNumericAxis = ({ axisModel, scale, axisRef }: IUseNumericAxis) => {
  const axisFunc = axisModel.place === 'bottom' ? axisBottom : axisLeft

  const refreshAxis = useCallback(() => {
    select(axisRef.current)
      .call(axisFunc(scale))
  }, [axisRef, axisFunc, scale])

  useEffect(() => {
    refreshAxis() // Must call once outside of reaction
    const disposer = reaction(() => axisModel.domain, domain => {
      refreshAxis()
    })
    return () => disposer()
    // todo: We don't want to depend on axisModel.domain
  },[refreshAxis, axisModel.domain])
}

