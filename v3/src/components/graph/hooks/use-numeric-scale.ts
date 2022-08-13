import { scaleLinear, scaleLog } from "d3"
import { autorun } from "mobx"
import { useContext, useEffect } from "react"
import { useMemo } from "use-memo-one"
import { INumericAxisModel } from "../models/axis-model"
import { GraphLayoutContext } from "../models/graph-layout"

export function useNumericScale(axisModel: INumericAxisModel) {
  const scale = useMemo(() => axisModel.scale === "log" ? scaleLog() : scaleLinear(), [axisModel.scale])
  const layout = useContext(GraphLayoutContext)

  // update domain when axis model changes
  useEffect(() => {
    const disposer = autorun(() => {
      const { min, max } = axisModel
      scale.domain([min, max])
    })
    return () => disposer()
  }, [axisModel, scale])

  // update range when extent changes (MobX)
  useEffect(() => {
    const { orientation, place } = axisModel
    const disposer = autorun(() => {
      const axisLength = layout.axisLength(place)
      const range = orientation === "vertical" ? [axisLength, 0] : [0, axisLength]
      scale.range(range)
    })
    return () => disposer()
  }, [axisModel, layout, scale])

  // update range when extent changes (React)
  useEffect(() => {
    const length = layout.axisLength(axisModel.place)
    const { orientation } = axisModel
    const range = orientation === "vertical" ? [length, 0] : [0, length]
    scale.range(range)
  }, [axisModel, layout, scale])

  return scale
}
