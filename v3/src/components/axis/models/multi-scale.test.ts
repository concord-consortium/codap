import { MultiScale } from "./multi-scale"

const kDefaultCategoricalDomain: string[] = []
const kDefaultLinearDomain = [0, 1]
const kDefaultLogDomain = [1, 10]
const kDefaultRange = [0, 1]
const kDefaultOrdinalRange: number[] = []

describe("MultiScale", () => {
  it("linear scales work as expected", () => {
    const scale = new MultiScale({ scaleType: "linear", orientation: "horizontal" })
    expect(scale.scaleType).toBe("linear")
    expect(scale.numericScale).toBeDefined()
    expect(scale.categoricalScale).not.toBeDefined()
    expect(scale.repetitions).toBe(1)
    expect(scale.cellLength).toBe(0)
    expect(scale.domain).toEqual(kDefaultLinearDomain)
    expect(scale.range).toEqual(kDefaultRange)
    expect(scale.getScreenCoordinate({ cell: 0, data: 0 })).toBe(0)
    expect(scale.getScreenCoordinate({ cell: 0, data: 1 })).toBe(1)
    expect(scale.getDataCoordinate(0)).toEqual({ cell: 0, data: 0 })
    expect(scale.getDataCoordinate(1)).toEqual({ cell: 0, data: 1 })
    expect(scale.formatValueForScale(0)).toBe("0")
    expect(scale.formatValueForScale(1)).toBe("1")
    scale.setNumericDomain([0, 10])
    expect(scale.domain).toEqual([0, 10])
    scale.setLength(10)
    expect(scale.length).toBe(10)
    expect(scale.range).toEqual([0, 10])
    scale.setRepetitions(2)
    expect(scale.repetitions).toBe(2)
    // setting the same scale type doesn't affect domain or range
    scale.setScaleType("linear")
    expect(scale.domain).toEqual([0, 10])
    expect(scale.range).toEqual([0, 10])
    // setting a new scale type resets domain but preserves range
    scale.setScaleType("band")
    expect(scale.domain).toEqual(kDefaultCategoricalDomain)
    expect(scale.range).toEqual([0, 10])
  })

  it("log scales work as expected", () => {
    const scale = new MultiScale({ scaleType: "log", orientation: "horizontal" })
    expect(scale.scaleType).toBe("log")
    expect(scale.numericScale).toBeDefined()
    expect(scale.categoricalScale).not.toBeDefined()
    expect(scale.repetitions).toBe(1)
    expect(scale.cellLength).toBe(0)
    expect(scale.domain).toEqual(kDefaultLogDomain)
    expect(scale.range).toEqual(kDefaultRange)
    expect(scale.getScreenCoordinate({ cell: 0, data: 0 })).toBeNaN()
    expect(scale.getScreenCoordinate({ cell: 0, data: 1 })).toBe(0)
    expect(scale.getScreenCoordinate({ cell: 0, data: 10 })).toBe(1)
    expect(scale.getDataCoordinate(0)).toEqual({ cell: 0, data: 1 })
    // expect(scale.getDataCoordinate(1)).toEqual({ cell: 0, data: 10 })
    expect(scale.formatValueForScale(0)).toBe("0")
    expect(scale.formatValueForScale(1)).toBe("1")
    scale.setNumericDomain([0, 10])
    expect(scale.domain).toEqual([0, 10])
    scale.setLength(10)
    expect(scale.length).toBe(10)
    expect(scale.range).toEqual([0, 10])
    scale.setRepetitions(2)
    expect(scale.repetitions).toBe(2)
    // setting the same scale type doesn't affect domain or range
    scale.setScaleType("log")
    expect(scale.domain).toEqual([0, 10])
    expect(scale.range).toEqual([0, 10])
    // setting a new scale type resets domain but preserves range
    scale.setScaleType("band")
    expect(scale.domain).toEqual(kDefaultCategoricalDomain)
    expect(scale.range).toEqual([0, 10])
  })

  it("band (categorical) scales work as expected", () => {
    const scale = new MultiScale({ scaleType: "band", orientation: "horizontal" })
    expect(scale.scaleType).toBe("band")
    expect(scale.numericScale).not.toBeDefined()
    expect(scale.categoricalScale).toBeDefined()
    expect(scale.cellLength).toBe(0)
    expect(scale.domain).toEqual(kDefaultCategoricalDomain)
    expect(scale.range).toEqual(kDefaultRange)
    scale.setCategoricalDomain(["one", "two"])
    expect(scale.domain).toEqual(["one", "two"])
    expect(scale.getScreenCoordinate({ cell: 0, data: "one" })).toBe(0)
    expect(scale.getScreenCoordinate({ cell: 0, data: "two" })).toBe(0.5)
    expect(scale.getDataCoordinate(0)).toEqual({ cell: 0, data: NaN })
    expect(scale.getDataCoordinate(1)).toEqual({ cell: 0, data: NaN })
  })
  it("ordinal scales work as expected", () => {
    const scale = new MultiScale({ scaleType: "ordinal", orientation: "vertical" })
    expect(scale.scaleType).toBe("ordinal")
    expect(scale.numericScale).not.toBeDefined()
    expect(scale.categoricalScale).toBeDefined()
    expect(scale.cellLength).toBe(0)
    expect(scale.domain).toEqual(kDefaultCategoricalDomain)
    expect(scale.range).toEqual(kDefaultOrdinalRange)
  })
})
