import { scaleLinear, scaleLog } from "d3"
import { autorun } from "mobx"
import { useEffect, useMemo } from "react"
import { INumericAxisModel } from "../models/axis-model"

interface IProps {
  axisModel: INumericAxisModel
  extent: number
}
export function useNumericScale({ axisModel, extent }: IProps) {
  const scale = useMemo(() => axisModel.scale === "log" ? scaleLog() : scaleLinear(), [axisModel.scale])

  // update domain when axis model changes
  useEffect(() => {
    const disposer = autorun(() => {
      const { min, max } = axisModel
      scale.domain([min, max])
    })
    return () => disposer()
  }, [axisModel, scale])

  // update range when extent changes
  useEffect(() => {
    const { orientation } = axisModel
    const range = orientation === "vertical" ? [extent, 0] : [0, extent]
    scale.range(range)
  }, [axisModel, extent, scale])

  return scale
}
