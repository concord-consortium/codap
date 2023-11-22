import { cachedFnFactory } from "./mst-utils"

describe("cachedFnFactory", () => {
  it("should return a function that lazily caches the value", () => {
    const recalculate = jest.fn(() => "foo")
    const cachedFn = cachedFnFactory(recalculate)
    expect(recalculate).not.toHaveBeenCalled()
    expect(cachedFn()).toEqual("foo")
    expect(cachedFn()).toEqual("foo")
    expect(recalculate).toHaveBeenCalledTimes(1)
  })

  it("should return a function that caches the value until invalidate() is called", () => {
    const recalculate = jest.fn(() => "foo")
    const cachedFn = cachedFnFactory(recalculate)
    expect(cachedFn()).toEqual("foo")
    recalculate.mockImplementation(() => "bar")
    expect(cachedFn()).toEqual("foo")
    expect(recalculate).toHaveBeenCalledTimes(1)
    cachedFn.invalidate()
    expect(cachedFn()).toEqual("bar")
    expect(cachedFn()).toEqual("bar")
    expect(recalculate).toHaveBeenCalledTimes(2)
  })
})
