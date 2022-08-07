import { scaleLinear, scaleLog } from "d3"
import { autorun } from "mobx"
import { useEffect, useMemo } from "react"
import { INumericAxisModel } from "./axis-model"

interface IProps {
  axis: INumericAxisModel
  extent: number
}
export function useNumericAxisScale({ axis, extent }: IProps) {
  const scale = useMemo(() => axis.scale === "log" ? scaleLog() : scaleLinear(), [axis.scale])

  // update domain when axis model changes
  useEffect(() => {
    const disposer = autorun(() => {
      const { min, max } = axis
      scale.domain([min, max])
    })
    return () => disposer()
  }, [axis, scale])

  // update range when extent changes
  useEffect(() => {
    const { orientation } = axis
    const range = orientation === "vertical" ? [extent, 0] : [0, extent]
    scale.range(range)
  }, [axis, extent, scale])

  return scale
}
