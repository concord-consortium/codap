import { evaluate } from "../test-utils/formula-test-utils"
import { UNDEF_RESULT } from "./function-utils"

// Note that aggregate functions require formula-test-utils since they use the custom MathJS scope API to support
// caching. Therefore, they cannot be simply tested using basic MathJS evaluation, similar to arithmetic functions.

// Most of the tests use Speed attribute from Mammals dataset, as this attribute is mostly numeric, but has some
// empty values, which should be ignored by aggregate functions.

describe("count", () => {
  it("returns correct value", () => {
    expect(evaluate("count(LifeSpan)")).toBe(27)
    expect(evaluate("count(Speed)")).toBe(24) // a few empty cells
  })

  it("supports filter expression", () => {
    expect(evaluate("count(Speed, Diet = 'plants')")).toBe(7)
  })

  it("supports single value argument", () => {
    expect(evaluate("count(1, true)")).toEqual(1)
    expect(evaluate("count(1, false)")).toEqual(0)
  })
})

describe("mad", () => {
  it("returns correct value", () => {
    expect(evaluate("mad(Speed)")).toBeCloseTo(11.5)
  })

  it("supports filter expression", () => {
    expect(evaluate("mad(Speed, Diet = 'plants')")).toBeCloseTo(10)
  })

  it("ignores non-numeric values", () => {
    expect(evaluate("mad(Diet)")).toEqual(UNDEF_RESULT)
  })

  it("supports single value argument", () => {
    expect(evaluate("mad(1, true)")).toEqual(0)
    expect(evaluate("mad(1, false)")).toEqual(UNDEF_RESULT)
  })
})

describe("max", () => {
  it("returns correct value", () => {
    expect(evaluate("max(Speed)")).toBe(110)
  })

  it("supports filter expression", () => {
    expect(evaluate("max(Speed, Diet = 'plants')")).toBe(98)
  })

  it("ignores non-numeric values", () => {
    expect(evaluate("max(Diet)")).toEqual(UNDEF_RESULT)
  })

  it("supports single value argument", () => {
    expect(evaluate("max(1, true)")).toEqual(1)
    expect(evaluate("max(1, false)")).toEqual(UNDEF_RESULT)
  })
})

describe("mean", () => {
  it("returns correct value", () => {
    expect(evaluate("mean(Speed)")).toBeCloseTo(48.917)
  })

  it("supports filter expression", () => {
    expect(evaluate("mean(Speed, Diet = 'plants')")).toBeCloseTo(57.571)
  })

  it("ignores non-numeric values", () => {
    expect(evaluate("mean(Diet)")).toEqual(UNDEF_RESULT)
  })

  it("supports single value argument", () => {
    expect(evaluate("mean(1, true)")).toEqual(1)
    expect(evaluate("mean(1, false)")).toEqual(UNDEF_RESULT)
  })
})

describe("median", () => {
  it("returns correct value", () => {
    expect(evaluate("median(Speed)")).toBeCloseTo(49)
  })

  it("supports filter expression", () => {
    expect(evaluate("median(Speed, Diet = 'plants')")).toBeCloseTo(50)
  })

  it("ignores non-numeric values", () => {
    expect(evaluate("median(Diet)")).toEqual(UNDEF_RESULT)
  })

  it("supports single value argument", () => {
    expect(evaluate("median(1, true)")).toEqual(1)
    expect(evaluate("median(1, false)")).toEqual(UNDEF_RESULT)
  })
})

describe("min", () => {
  it("returns correct value", () => {
    expect(evaluate("min(Speed)")).toBe(1)
  })

  it("supports filter expression", () => {
    expect(evaluate("min(Speed, Diet = 'plants')")).toBe(40)
  })

  it("ignores non-numeric values", () => {
    expect(evaluate("min(Diet)")).toEqual(UNDEF_RESULT)
  })

  it("supports single value argument", () => {
    expect(evaluate("min(1, true)")).toEqual(1)
    expect(evaluate("min(1, false)")).toEqual(UNDEF_RESULT)
  })
})

describe("percentile", () => {
  it("returns correct value", () => {
    expect(evaluate("percentile(Speed, 0)")).toBeCloseTo(1)
    expect(evaluate("percentile(Speed, 50)")).toBeCloseTo(49)
    expect(evaluate("percentile(Speed, 100)")).toBeCloseTo(110)
  })

  it("supports filter expression", () => {
    expect(evaluate("percentile(Speed, 0, Diet = 'plants')")).toBeCloseTo(40)
    expect(evaluate("percentile(Speed, 50, Diet = 'plants')")).toBeCloseTo(50)
    expect(evaluate("percentile(Speed, 100, Diet = 'plants')")).toBeCloseTo(98)
  })

  it("ignores non-numeric values", () => {
    expect(evaluate("percentile(Diet, 50)")).toEqual(UNDEF_RESULT)
  })

  it("supports single value argument", () => {
    expect(evaluate("percentile(1, 50, true)")).toEqual(1)
    expect(evaluate("percentile(1, 50, false)")).toEqual(UNDEF_RESULT)
  })
})

describe("rollingMean", () => {
  it("returns correct value", () => {
    expect(evaluate("rollingMean(Speed, 3)", 0)).toBe("")
    expect(evaluate("rollingMean(Speed, 3)", 1)).toBeCloseTo(40)
    expect(evaluate("rollingMean(Speed, 3)", 2)).toBeCloseTo(39)
  })

  it("supports filter expression", () => {
    expect(evaluate("rollingMean(Speed, 3, Diet = 'plants')", 0)).toBe("")
    expect(evaluate("rollingMean(Speed, 3, Diet = 'plants')", 1)).toBeCloseTo(43.33)
    expect(evaluate("rollingMean(Speed, 3, Diet = 'plants')", 2)).toBe("")
    expect(evaluate("rollingMean(Speed, 3, Diet = 'plants')", 7)).toBeCloseTo(46.67)
  })

  it("ignores non-numeric values", () => {
    expect(evaluate("rollingMean(Diet, 3)")).toEqual(UNDEF_RESULT)
  })
})

describe("stdDev", () => {
  it("returns correct value", () => {
    expect(evaluate("stdDev(Speed)")).toBeCloseTo(25.46)
  })

  it("supports filter expression", () => {
    expect(evaluate("stdDev(Speed, Diet = 'plants')")).toBeCloseTo(20.41)
  })

  it("ignores non-numeric values", () => {
    expect(evaluate("stdDev(Diet)")).toEqual(UNDEF_RESULT)
  })

  it("supports single value argument", () => {
    expect(evaluate("stdDev(1, true)")).toEqual(0)
    expect(evaluate("stdDev(1, false)")).toEqual(UNDEF_RESULT)
  })
})

describe("stdErr", () => {
  it("returns correct value", () => {
    expect(evaluate("stdErr(Speed)")).toBeCloseTo(5.2)
  })

  it("supports filter expression", () => {
    expect(evaluate("stdErr(Speed, Diet = 'plants')")).toBeCloseTo(7.71)
  })

  it("ignores non-numeric values", () => {
    expect(evaluate("stdErr(Diet)")).toEqual(UNDEF_RESULT)
  })

  it("supports single value argument", () => {
    expect(evaluate("stdErr(1, true)")).toEqual(0)
    expect(evaluate("stdErr(1, false)")).toEqual(UNDEF_RESULT)
  })
})

describe("sum", () => {
  it("returns correct value", () => {
    expect(evaluate("sum(Speed)")).toBeCloseTo(1174)
  })

  it("supports filter expression", () => {
    expect(evaluate("sum(Speed, Diet = 'plants')")).toBeCloseTo(403)
  })

  it("ignores non-numeric values", () => {
    expect(evaluate("sum(Diet)")).toEqual(UNDEF_RESULT)
  })

  it("supports single value argument", () => {
    expect(evaluate("sum(1, true)")).toEqual(1)
    expect(evaluate("sum(1, false)")).toEqual(UNDEF_RESULT)
  })
})

describe("uniqueValues", () => {
  it("works as expected", () => {
    expect(evaluate(`uniqueValues(Order)`)).toEqual(12)
    expect(evaluate(`uniqueValues(Diet)`)).toEqual(3)
    expect(evaluate(`uniqueValues(Diet, Habitat="water")`)).toEqual(1)
    expect(evaluate(`uniqueValues("foo")`)).toEqual(1)
    expect(evaluate(`uniqueValues("foo", false)`)).toEqual(UNDEF_RESULT)
  })
})

describe("variance", () => {
  it("returns correct value", () => {
    expect(evaluate("variance(Speed)")).toBeCloseTo(648.17)
  })

  it("supports filter expression", () => {
    expect(evaluate("variance(Speed, Diet = 'plants')")).toBeCloseTo(416.62)
  })

  it("ignores non-numeric values", () => {
    expect(evaluate("variance(Diet)")).toEqual(UNDEF_RESULT)
  })

  it("supports single value argument", () => {
    expect(evaluate("variance(1, true)")).toEqual(0)
    expect(evaluate("variance(1, false)")).toEqual(UNDEF_RESULT)
  })
})
