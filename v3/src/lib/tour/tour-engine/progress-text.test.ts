import { renderProgressText } from "./progress-text"

describe("renderProgressText", () => {
  it("uses the default template when none is provided", () => {
    expect(renderProgressText(undefined, 1, 5)).toBe("1 of 5")
  })

  it("substitutes {{current}} and {{total}}", () => {
    expect(renderProgressText("Step {{current}} of {{total}}", 2, 7)).toBe("Step 2 of 7")
  })

  it("substitutes multiple occurrences of each placeholder", () => {
    expect(renderProgressText("{{current}}/{{total}} - {{current}}/{{total}}", 3, 4))
      .toBe("3/4 - 3/4")
  })

  it("handles a custom template with neither placeholder", () => {
    expect(renderProgressText("Hello", 1, 2)).toBe("Hello")
  })
})
