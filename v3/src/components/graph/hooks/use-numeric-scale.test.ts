import { renderHook } from "@testing-library/react-hooks"
import { NumericAxisModel } from "../models/axis-model"
import { useNumericScale } from "./use-numeric-scale"

const mockD3 = jest.requireActual("d3")
const mockScaleLinear = jest.fn((...args: any[]) => mockD3.scaleLinear(...args))
const mockScaleLog = jest.fn((...args: any[]) => mockD3.scaleLog(...args))
jest.doMock("d3", () => ({
  scaleLinear: (...args: any[]) => mockScaleLinear(...args),
  scaleLog: (...args: any[]) => mockScaleLog(...args)
}))

describe.skip("useNumericAxisScale", () => {
  const xAxis = NumericAxisModel.create({ place: "bottom", min: 0, max: 10 })
  const yAxis = NumericAxisModel.create({ place: "left", min: 0, max: 10 })

  beforeEach(() => {
    mockScaleLinear.mockClear()
    mockScaleLog.mockClear()
  })

  it("should update the domain when the axis model changes", () => {
    const { result } = renderHook(() => useNumericScale(xAxis))
    expect(result.current.domain()).toEqual([0, 10])
    expect(result.current.range()).toEqual([0, 100])
    xAxis.setDomain(0, 100)
    // domain is updated without an additional render
    expect(result.current.domain()).toEqual([0, 100])
    expect(result.current.range()).toEqual([0, 100])
    expect(mockScaleLinear).toHaveBeenCalledTimes(1)
    expect(mockScaleLog).toHaveBeenCalledTimes(0)
  })

  it("should update the range when the extent changes", () => {
    let width = 100
    const { rerender, result } = renderHook(() => useNumericScale(xAxis))
    expect(result.current.range()).toEqual([0, 100])
    width = 1000
    rerender()
    // range is updated after a render
    expect(result.current.range()).toEqual([0, width])
    expect(mockScaleLinear).toHaveBeenCalledTimes(1)
    expect(mockScaleLog).toHaveBeenCalledTimes(0)
  })

  it("should reverse the range for the vertical axis", () => {
    let height = 100
    const { rerender, result } = renderHook(() => useNumericScale(yAxis))
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
    expect(result.current.range()).toEqual([height, 0])
    expect(mockScaleLinear).toHaveBeenCalledTimes(1)
    expect(mockScaleLog).toHaveBeenCalledTimes(0)
  })

  it("should support logarithmic axes", () => {
    const { rerender, result } = renderHook(() => useNumericScale(xAxis))
    expect(result.current.domain()).toEqual([0, 100])
    expect(result.current.range()).toEqual([0, 100])
    xAxis.setScale("log")
    // domain is updated without an additional render
    expect(result.current.domain()).toEqual([0, 100])
    expect(result.current.range()).toEqual([0, 100])
    rerender()
    expect(mockScaleLinear).toHaveBeenCalledTimes(1)
    expect(mockScaleLog).toHaveBeenCalledTimes(1)
    expect(result.current.domain()).toEqual([0, 100])
    xAxis.setDomain(0, 10)
    // domain of new scale is updated without a render
    expect(result.current.domain()).toEqual([0, 10])
  })
})
