import { hasOwnProperty } from "./js-utils"

describe("JavaScript Utilities", () => {

  test("hasOwnProperty", () => {
    expect(hasOwnProperty({}, "")).toBe(false)
    expect(hasOwnProperty({ foo: undefined }, "foo")).toBe(true)
    expect(hasOwnProperty({ foo: "bar" }, "foo")).toBe(true)
    expect(hasOwnProperty({ foo: "bar" }, "bar")).toBe(false)
    expect(hasOwnProperty({ hasOwnProperty: true }, "foo")).toBe(false)
    expect(hasOwnProperty({ hasOwnProperty: undefined }, "hasOwnProperty")).toBe(true)
  })

})
