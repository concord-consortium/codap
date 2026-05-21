import { sortLegendCategories } from "./bar-chart-utils"

describe("sortLegendCategories", () => {
  it("returns a new array without mutating the input (numeric legend)", () => {
    const original = ["3", "1", "2"]
    const snapshot = [...original]
    const result = sortLegendCategories(original, "numeric")
    expect(result).not.toBe(original)
    expect(original).toEqual(snapshot)
  })

  it("returns a new array without mutating the input (date legend)", () => {
    const original = ["Feb 2020", "Jan 2020", "Mar 2020"]
    const snapshot = [...original]
    const result = sortLegendCategories(original, "date")
    expect(result).not.toBe(original)
    expect(original).toEqual(snapshot)
  })

  it("returns a new array without mutating the input (categorical legend)", () => {
    const original = ["banana", "apple", "cherry"]
    const snapshot = [...original]
    const result = sortLegendCategories(original, "categorical")
    expect(result).not.toBe(original)
    expect(original).toEqual(snapshot)
  })

  it("sorts numeric legend categories in descending order", () => {
    expect(sortLegendCategories(["1", "3", "2", "10"], "numeric")).toEqual(["10", "3", "2", "1"])
  })

  it("sorts date legend categories chronologically, most recent first", () => {
    expect(sortLegendCategories(["Feb 2020", "Jan 2020", "Mar 2020"], "date"))
      .toEqual(["Mar 2020", "Feb 2020", "Jan 2020"])
  })

  it("leaves categorical legend categories in their original order", () => {
    expect(sortLegendCategories(["banana", "apple", "cherry"], "categorical"))
      .toEqual(["banana", "apple", "cherry"])
  })

  it("leaves categories in their original order when the legend type is undefined", () => {
    expect(sortLegendCategories(["b", "a", "c"], undefined)).toEqual(["b", "a", "c"])
  })

  it("sorts unparseable numeric values to the end", () => {
    expect(sortLegendCategories(["2", "not-a-number", "1"], "numeric"))
      .toEqual(["2", "1", "not-a-number"])
  })
})
