import { math } from "./math"

describe("if", () => {
  it("implements if logic", () => {
    const fn = math.compile("if(x < 10, 'foo', 'bar')")
    expect(fn.evaluate({ x: 9 })).toEqual("foo")
    expect(fn.evaluate({ x: 11 })).toEqual("bar")
  })
})

describe("randomPick", () => {
  it("returns one of the values", () => {
    const fn = math.compile("randomPick('foo', 'bar', 'baz')")
    const result = fn.evaluate()
    expect(result === "foo" || result === "bar" || result === "baz").toBeTruthy()
  })
})

describe("random", () => {
  it("returns random number between 0 and 1", () => {
    const fn = math.compile("random()")
    const result = fn.evaluate()
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(1)
  })

  it("returns random number between 0 and max", () => {
    const fn = math.compile("random(10)")
    const result = fn.evaluate()
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(10)
  })

  it("returns random number between min and max", () => {
    const fn = math.compile("random(10, 20)")
    const result = fn.evaluate()
    expect(result).toBeGreaterThanOrEqual(10)
    expect(result).toBeLessThanOrEqual(20)
  })
})
