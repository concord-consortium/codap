import { cachedFnFactory, cachedFnWithArgsFactory } from "./mst-utils"

describe("cachedFnFactory", () => {
  it("should return a function that lazily caches the value", () => {
    const calculate = jest.fn(() => "foo")
    const cachedFn = cachedFnFactory(calculate)
    expect(calculate).not.toHaveBeenCalled()
    expect(cachedFn()).toEqual("foo")
    expect(cachedFn()).toEqual("foo")
    expect(calculate).toHaveBeenCalledTimes(1)
  })

  it("should return a function that caches the value until invalidate() is called", () => {
    const calculate = jest.fn(() => "foo")
    const cachedFn = cachedFnFactory(calculate)
    expect(cachedFn()).toEqual("foo")
    calculate.mockImplementation(() => "bar")
    expect(cachedFn()).toEqual("foo")
    expect(calculate).toHaveBeenCalledTimes(1)
    cachedFn.invalidate()
    expect(cachedFn()).toEqual("bar")
    expect(cachedFn()).toEqual("bar")
    expect(calculate).toHaveBeenCalledTimes(2)
  })
})

describe("cachedFnWithArgsFactory", () => {
  it("should return a function that lazily caches the value", () => {
    const calculate = jest.fn((a: number, b: number) => a + b)
    const key = jest.fn((a: number, b: number) => `${a}+${b}`)
    const cachedFn = cachedFnWithArgsFactory({ key, calculate, name: "testFn" })
    expect(key).not.toHaveBeenCalled()
    expect(calculate).not.toHaveBeenCalled()
    expect(cachedFn(1, 2)).toEqual(3)
    expect(key).toHaveBeenCalledTimes(1)
    expect(calculate).toHaveBeenCalledTimes(1)
    expect(cachedFn(2, 3)).toEqual(5)
    expect(key).toHaveBeenCalledTimes(2)
    expect(calculate).toHaveBeenCalledTimes(2)
    expect(cachedFn(1, 2)).toEqual(3)
    expect(cachedFn(2, 3)).toEqual(5)
    expect(key).toHaveBeenCalledTimes(4)
    expect(calculate).toHaveBeenCalledTimes(2)
  })

  it("should return a function that caches the value until invalidate() is called", () => {
    const calculate = jest.fn((a: number, b: number) => a + b)
    const key = jest.fn((a: number, b: number) => `${a}+${b}`)
    const cachedFn = cachedFnWithArgsFactory({ key, calculate, name: "testFn" })
    expect(cachedFn(1, 2)).toEqual(3)
    calculate.mockImplementation((a: number, b: number) => a * b)
    expect(cachedFn(1, 2)).toEqual(3)
    expect(calculate).toHaveBeenCalledTimes(1)
    cachedFn.invalidate(1, 2)
    expect(cachedFn(1, 2)).toEqual(2)
    expect(cachedFn(1, 2)).toEqual(2)
    expect(calculate).toHaveBeenCalledTimes(2)
  })
})
