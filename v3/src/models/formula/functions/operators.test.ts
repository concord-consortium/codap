import { math } from "./math"

describe("= operator", () => {
  it("compares dates for equality", () => {
    const fn1 = math.compile(`today() == today()`)
    expect(fn1.evaluate()).toBe(true)
    const fn2 = math.compile(`today() == today() + 24 * 3600`)
    expect(fn2.evaluate()).toBe(false)
  })
  it("compares dates for inequality", () => {
    const fn1 = math.compile(`today() != today()`)
    expect(fn1.evaluate()).toBe(false)
    const fn2 = math.compile(`today() != today() + 24 * 3600`)
    expect(fn2.evaluate()).toBe(true)
  })
})

describe("< operator", () => {
  it("compares numbers", () => {
    const f1 = math.compile("1 < 2")
    expect(f1.evaluate()).toBe(true)
    const f2 = math.compile("1 < 1")
    expect(f2.evaluate()).toBe(false)
    const f3 = math.compile("2 < 1")
    expect(f3.evaluate()).toBe(false)
    // NaN comparisons are always false
    const f4 = math.compile("0/0 < 0")
    expect(f4.evaluate()).toBe(false)
    const f5 = math.compile("0 < 0/0")
    expect(f5.evaluate()).toBe(false)
  })
  it("compares dates numerically", () => {
    const f1 = math.compile("today() < today()")
    expect(f1.evaluate()).toBe(false)
    const f2 = math.compile("today() + 24 * 3600 < today()")
    expect(f2.evaluate()).toBe(false)
    const f3 = math.compile("today() < today() + 24 * 3600")
    expect(f3.evaluate()).toBe(true)
  })
  it("compares numeric strings", () => {
    const f1 = math.compile("'1' < '2'")
    expect(f1.evaluate()).toBe(true)
    const f2 = math.compile("'1' < '1'")
    expect(f2.evaluate()).toBe(false)
    const f3 = math.compile("'2' < '1'")
    expect(f3.evaluate()).toBe(false)
    const f4 = math.compile("'1' < '12'")
    expect(f4.evaluate()).toBe(true)
  })
  it("compares strings", () => {
    const f1 = math.compile("'abc' < 'def'")
    expect(f1.evaluate()).toBe(true)
    const f2 = math.compile("'abc' < 'abc'")
    expect(f2.evaluate()).toBe(false)
    const f3 = math.compile("'def' < 'abc'")
    expect(f3.evaluate()).toBe(false)
  })
})

describe("<= operator", () => {
  it("compares numbers", () => {
    const f1 = math.compile("1 <= 2")
    expect(f1.evaluate()).toBe(true)
    const f2 = math.compile("1 <= 1")
    expect(f2.evaluate()).toBe(true)
    const f3 = math.compile("2 <= 1")
    expect(f3.evaluate()).toBe(false)
    // NaN comparisons are always false
    const f4 = math.compile("0/0 <= 0")
    expect(f4.evaluate()).toBe(false)
    const f5 = math.compile("0 <= 0/0")
    expect(f5.evaluate()).toBe(false)
  })
  it("compares dates numerically", () => {
    const f1 = math.compile("today() <= today()")
    expect(f1.evaluate()).toBe(true)
    const f2 = math.compile("today() + 24 * 3600 <= today()")
    expect(f2.evaluate()).toBe(false)
    const f3 = math.compile("today() <= today() + 24 * 3600")
    expect(f3.evaluate()).toBe(true)
  })
  it("compares numeric strings", () => {
    const f1 = math.compile("'1' <= '2'")
    expect(f1.evaluate()).toBe(true)
    const f2 = math.compile("'1' <= '1'")
    expect(f2.evaluate()).toBe(true)
    const f3 = math.compile("'2' <= '1'")
    expect(f3.evaluate()).toBe(false)
    const f4 = math.compile("'1' <= '12'")
    expect(f4.evaluate()).toBe(true)
  })
  it("compares strings", () => {
    const f1 = math.compile("'abc' <= 'def'")
    expect(f1.evaluate()).toBe(true)
    const f2 = math.compile("'abc' <= 'abc'")
    expect(f2.evaluate()).toBe(true)
    const f3 = math.compile("'def' < 'abc'")
    expect(f3.evaluate()).toBe(false)
  })
})

describe("> operator", () => {
  it("compares numbers", () => {
    const f1 = math.compile("1 > 2")
    expect(f1.evaluate()).toBe(false)
    const f2 = math.compile("1 > 1")
    expect(f2.evaluate()).toBe(false)
    const f3 = math.compile("2 > 1")
    expect(f3.evaluate()).toBe(true)
    // NaN comparisons are always false
    const f4 = math.compile("0/0 > 0")
    expect(f4.evaluate()).toBe(false)
    const f5 = math.compile("0 > 0/0")
    expect(f5.evaluate()).toBe(false)
  })
  it("compares dates numerically", () => {
    const f1 = math.compile("today() > today()")
    expect(f1.evaluate()).toBe(false)
    const f2 = math.compile("today() + 24 * 3600 > today()")
    expect(f2.evaluate()).toBe(true)
    const f3 = math.compile("today() > today() + 24 * 3600")
    expect(f3.evaluate()).toBe(false)
  })
  it("compares numeric strings", () => {
    const f1 = math.compile("'1' > '2'")
    expect(f1.evaluate()).toBe(false)
    const f2 = math.compile("'1' > '1'")
    expect(f2.evaluate()).toBe(false)
    const f3 = math.compile("'2' > '1'")
    expect(f3.evaluate()).toBe(true)
    const f4 = math.compile("'1' > '12'")
    expect(f4.evaluate()).toBe(false)
  })
  it("compares strings", () => {
    const f1 = math.compile("'abc' > 'def'")
    expect(f1.evaluate()).toBe(false)
    const f2 = math.compile("'abc' > 'abc'")
    expect(f2.evaluate()).toBe(false)
    const f3 = math.compile("'def' > 'abc'")
    expect(f3.evaluate()).toBe(true)
  })
})

describe(">= operator", () => {
  it("compares numbers", () => {
    const f1 = math.compile("1 >= 2")
    expect(f1.evaluate()).toBe(false)
    const f2 = math.compile("1 >= 1")
    expect(f2.evaluate()).toBe(true)
    const f3 = math.compile("2 >= 1")
    expect(f3.evaluate()).toBe(true)
    // NaN comparisons are always false
    const f4 = math.compile("0/0 >= 0")
    expect(f4.evaluate()).toBe(false)
    const f5 = math.compile("0 >= 0/0")
    expect(f5.evaluate()).toBe(false)
  })
  it("compares dates numerically", () => {
    const f1 = math.compile("today() >= today()")
    expect(f1.evaluate()).toBe(true)
    const f2 = math.compile("today() + 24 * 3600 >= today()")
    expect(f2.evaluate()).toBe(true)
    const f3 = math.compile("today() >= today() + 24 * 3600")
    expect(f3.evaluate()).toBe(false)
  })
  it("compares numeric strings", () => {
    const f1 = math.compile("'1' >= '2'")
    expect(f1.evaluate()).toBe(false)
    const f2 = math.compile("'1' >= '1'")
    expect(f2.evaluate()).toBe(true)
    const f3 = math.compile("'2' >= '1'")
    expect(f3.evaluate()).toBe(true)
    const f4 = math.compile("'1' >= '12'")
    expect(f4.evaluate()).toBe(false)
  })
  it("compares strings", () => {
    const f1 = math.compile("'abc' >= 'def'")
    expect(f1.evaluate()).toBe(false)
    const f2 = math.compile("'abc' >= 'abc'")
    expect(f2.evaluate()).toBe(true)
    const f3 = math.compile("'def' >= 'abc'")
    expect(f3.evaluate()).toBe(true)
  })
})

describe("+ operator", () => {
  it("adds two numbers", () => {
    const fn = math.compile("1 + 2")
    expect(fn.evaluate()).toEqual(3)
  })

  it("adds two numeric strings", () => {
    const fn = math.compile("'1' + '2'")
    expect(fn.evaluate()).toEqual(3)
  })

  it("adds a number and a numeric string", () => {
    const fn = math.compile("1 + '2'")
    expect(fn.evaluate()).toEqual(3)
  })

  it("concatenates a number and a non-numeric string", () => {
    const fn = math.compile("1 + 'a'")
    expect(fn.evaluate()).toBe("1a")
  })

  it("throws an exception when adding dates", () => {
    const fn = math.compile("'1/1/2020' + '1/1/2020'")
    expect(() => fn.evaluate()).toThrow()
  })

  it("adds seconds to dates", () => {
    const fn = math.compile("'1/1/2020' + 60 * 60") // + 1 hour
    expect(fn.evaluate()).toEqual(new Date(2020, 0, 1, 1))
    const fn2 = math.compile("'1/1/2020' + 60 * 60 * 24") // + 1 day
    expect(fn2.evaluate()).toEqual(new Date(2020, 0, 2))

    const fn3 = math.compile("60 * 60 + '1/1/2020'") // + 1 hour
    expect(fn3.evaluate()).toEqual(new Date(2020, 0, 1, 1))
    const fn4 = math.compile("60 * 60 * 24 + '1/1/2020'") // + 1 day
    expect(fn4.evaluate()).toEqual(new Date(2020, 0, 2))
  })

  it("concatenates strings", () => {
    const fn = math.compile("'foo' + 'bar'")
    expect(fn.evaluate()).toEqual("foobar")
  })
})

describe("- operator", () => {
  it("subtracts two numbers", () => {
    const fn = math.compile("2 - 1")
    expect(fn.evaluate()).toEqual(1)
  })

  it("subtracts two numeric strings", () => {
    const fn = math.compile("'2' - '1'")
    expect(fn.evaluate()).toEqual(1)
  })

  it("subtracts a number and a numeric string", () => {
    const fn = math.compile("2 - '1'")
    expect(fn.evaluate()).toEqual(1)
  })

  it("subtracts dates", () => {
    const fn = math.compile("'1/2/2020' - '1/1/2020'") // 1 day
    const val1 = new Date(2020, 0, 2).valueOf()
    const val2 = new Date(2020, 0, 1).valueOf()
    expect(fn.evaluate()).toEqual(new Date(val1 - val2))
  })

  it("subtracts a number from a date", () => {
    const fn = math.compile("'1/2/2020' - 86400") // 1 day
    expect(fn.evaluate()).toEqual(new Date(2020, 0, 1))
  })

  it("throws an error when subtracting a date from a number", () => {
    const fn = math.compile("86400 - '1/2/2020'") // 1 day
    expect(() => fn.evaluate()).toThrow()
  })

  it("throws an error when subtracting strings", () => {
    const fn = math.compile("'foo' - 'bar'")
    expect(() => fn.evaluate()).toThrow("Invalid arguments for subtract operator: foo, bar")
  })
})
