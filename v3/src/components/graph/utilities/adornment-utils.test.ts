import { shouldShowPercentOption, shouldShowPercentTypeOptions } from './adornment-utils'

describe("shouldShowPercentOption", () => {
  it("should return false with no categorical attributes", () => {
    expect(shouldShowPercentOption({bottom: "numeric", left: "numeric"})).toBe(false)
  })
  it("should return true with at least one categorical attribute", () => {
    expect(shouldShowPercentOption({bottom: "categorical", left: "numeric"})).toBe(true)
  })
  it("should return true with multiple categorical attributes", () => {
    expect(shouldShowPercentOption({bottom: "categorical", left: "categorical", top: "categorical"})).toBe(true)
  })
})

describe("shouldShowPercentTypeOptions", () => {
  it("should return false with only one categorical attribute", () => {
    expect(shouldShowPercentTypeOptions({bottom: "categorical", left: "numeric"})).toBe(false)
  })
  it("should return true with only two categorical attributes on axes that are perpendicular to each other", () => {
    expect(shouldShowPercentTypeOptions({bottom: "categorical", left: "categorical"})).toBe(true)
  })
  it("should return false with only two categorical attributes on axes that are parallel to each other", () => {
    expect(shouldShowPercentTypeOptions({left: "categorical", right: "categorical"})).toBe(false)
  })
  it("should return false with more than two categorical attributes", () => {
    expect(shouldShowPercentTypeOptions({bottom: "categorical", left: "categorical", top: "categorical"})).toBe(false)
  })
})
