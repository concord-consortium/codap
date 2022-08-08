import { renderHook } from "@testing-library/react-hooks"
import { scaleLinear } from "d3"
import { autorun } from "mobx"
import { Instance, types } from "mobx-state-tree"
import { useEffect } from "react"
import { useMemo } from "use-memo-one"

const AxisModel = types.model("AxisModel", {
  type: types.enumeration(["Cell", "CellLinear", "Count"]),
  orientation: types.enumeration(["horizontal", "vertical"]),
  min: types.maybe(types.number),
  max: types.maybe(types.number)
})
.actions(self => ({
  setDomain(min: number, max: number) {
    self.min = min
    self.max = max
  }
}))
interface IAxisModel extends Instance<typeof AxisModel> {}

interface IUseLinearScaleProps {
  axis: IAxisModel
  extent: number
}
function useLinearScale({ axis, extent }: IUseLinearScaleProps) {
  const scale = useMemo(() => scaleLinear(), [])

  // update domain when axis model changes
  useEffect(() => {
    const disposer = autorun(() => {
      const { min, max } = axis
      scale.domain([min ?? NaN, max ?? NaN])
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

describe("useLinearScale", () => {
  const xAxis = AxisModel.create({ type: "CellLinear", orientation: "horizontal", min: 0, max: 10 })
  const yAxis = AxisModel.create({ type: "CellLinear", orientation: "vertical", min: 0, max: 10 })

  it("should update the domain when the axis model changes", () => {
    const { result } = renderHook(() => useLinearScale({ axis: xAxis, extent: 100 }))
    expect(result.current.domain()).toEqual([0, 10])
    expect(result.current.range()).toEqual([0, 100])
    xAxis.setDomain(0, 100)
    // domain is updated without an additional render
    expect(result.current.domain()).toEqual([0, 100])
    expect(result.current.range()).toEqual([0, 100])
  })

  it("should update the range when the extent changes", () => {
    let width = 100
    const { rerender, result } = renderHook(() => useLinearScale({ axis: xAxis, extent: width }))
    expect(result.current.range()).toEqual([0, 100])
    width = 1000
    rerender()
    // range is updated after a render
    expect(result.current.range()).toEqual([0, 1000])
  })

  it("should reverse the range for the vertical axis", () => {
    let height = 100
    const { rerender, result } = renderHook(() => useLinearScale({ axis: yAxis, extent: height }))
    expect(result.current.domain()).toEqual([0, 10])
    expect(result.current.range()).toEqual([100, 0])
    yAxis.setDomain(0, 50)
    expect(result.current.domain()).toEqual([0, 50])
    expect(result.current.range()).toEqual([100, 0])
    height = 500
    expect(result.current.domain()).toEqual([0, 50])
    expect(result.current.range()).toEqual([100, 0])
    // range is updated after a render
    rerender()
    expect(result.current.domain()).toEqual([0, 50])
    expect(result.current.range()).toEqual([500, 0])
  })
})
