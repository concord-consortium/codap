// tour-manager imports the tour-engine and styles; mock them to avoid loading the real engine
jest.mock("./tour-engine", () => ({ createTourEngine: jest.fn() }))
jest.mock("./tour-styles.scss", () => ({}))

import { sanitizeHighlightValues, sanitizeTourValues, pickString, pickNumber } from "./tour-sanitize"

describe("pickString", () => {
  it("returns strings", () => {
    expect(pickString("hello")).toBe("hello")
  })

  it("returns undefined for non-strings", () => {
    expect(pickString(42)).toBeUndefined()
    expect(pickString(null)).toBeUndefined()
    expect(pickString(undefined)).toBeUndefined()
    expect(pickString(true)).toBeUndefined()
  })
})

describe("pickNumber", () => {
  it("returns numbers", () => {
    expect(pickNumber(42)).toBe(42)
  })

  it("returns undefined for non-numbers", () => {
    expect(pickNumber("42")).toBeUndefined()
    expect(pickNumber(null)).toBeUndefined()
  })
})

describe("sanitizeHighlightValues", () => {
  it("picks known step fields and drops unknown ones", () => {
    const result = sanitizeHighlightValues({
      tourKey: "toolShelf.graph",
      testId: "my-button",
      selector: ".foo",
      component: "myGraph",
      id: "step1",
      unknownField: "should be dropped"
    })
    expect(result.tourKey).toBe("toolShelf.graph")
    expect(result.testId).toBe("my-button")
    expect(result.selector).toBe(".foo")
    expect(result.component).toBe("myGraph")
    expect(result.id).toBe("step1")
    expect((result as any).unknownField).toBeUndefined()
    expect((result as any).overlayColor).toBeUndefined()
    expect((result as any).overlayOpacity).toBeUndefined()
  })

  it("strips HTML from popover title and description", () => {
    const result = sanitizeHighlightValues({
      popover: {
        title: "<b>Bold</b> title",
        description: "Click <script>alert('xss')</script>here"
      }
    })
    expect(result.popover?.title).toBe("Bold title")
    expect(result.popover?.description).toBe("Click alert('xss')here")
  })

  it("validates popover side and align values", () => {
    const valid = sanitizeHighlightValues({
      popover: { title: "T", side: "top", align: "center" }
    })
    expect(valid.popover?.side).toBe("top")
    expect(valid.popover?.align).toBe("center")

    const invalid = sanitizeHighlightValues({
      popover: { title: "T", side: "diagonal", align: "middle" }
    })
    expect(invalid.popover?.side).toBeUndefined()
    expect(invalid.popover?.align).toBeUndefined()
  })

  it("drops non-string/non-number fields", () => {
    const result = sanitizeHighlightValues({
      tourKey: 123,
      testId: 42,
    })
    expect(result.tourKey).toBeUndefined()
    expect(result.testId).toBeUndefined()
  })

  it("returns empty object for empty input", () => {
    const result = sanitizeHighlightValues({})
    expect(result).toEqual({})
  })
})

describe("sanitizeTourValues", () => {
  it("sanitizes steps and tour-level options", () => {
    const result = sanitizeTourValues({
      steps: [
        { selector: ".step1", id: "s1" },
        { tourKey: "toolShelf.graph" }
      ],
      showProgress: true,
      allowClose: false,
      nextBtnText: "Next",
      doneBtnText: "Done!"
    })
    expect(result.steps).toHaveLength(2)
    expect(result.steps[0].selector).toBe(".step1")
    expect(result.steps[0].id).toBe("s1")
    expect(result.steps[1].tourKey).toBe("toolShelf.graph")
    expect(result.showProgress).toBe(true)
    expect(result.allowClose).toBe(false)
    expect(result.nextBtnText).toBe("Next")
    expect(result.doneBtnText).toBe("Done!")
    expect((result as any).overlayOpacity).toBeUndefined()
  })

  it("filters out invalid steps", () => {
    const result = sanitizeTourValues({
      steps: [
        { selector: ".valid" },
        null,
        "not an object",
        42,
        { selector: ".also-valid" }
      ]
    })
    expect(result.steps).toHaveLength(2)
    expect(result.steps[0].selector).toBe(".valid")
    expect(result.steps[1].selector).toBe(".also-valid")
  })

  it("defaults to empty steps when steps is not an array", () => {
    expect(sanitizeTourValues({}).steps).toEqual([])
    expect(sanitizeTourValues({ steps: "not array" }).steps).toEqual([])
  })

  it("validates showButtons and disableButtons values", () => {
    const result = sanitizeTourValues({
      steps: [],
      showButtons: ["next", "invalid", "close"],
      disableButtons: ["previous", "bogus"]
    })
    expect(result.showButtons).toEqual(["next", "close"])
    expect(result.disableButtons).toEqual(["previous"])
  })

  it("allows empty arrays for showButtons and disableButtons", () => {
    const result = sanitizeTourValues({
      steps: [],
      showButtons: [],
      disableButtons: []
    })
    expect(result.showButtons).toEqual([])
    expect(result.disableButtons).toEqual([])
  })

  it("strips HTML from step popover text", () => {
    const result = sanitizeTourValues({
      steps: [{ popover: { title: "<em>Hi</em>", description: "<img src=x>Desc" } }]
    })
    expect(result.steps[0].popover?.title).toBe("Hi")
    expect(result.steps[0].popover?.description).toBe("Desc")
  })

  it("drops removed driver.js per-step fields", () => {
    const result = sanitizeTourValues({
      steps: [{ selector: ".s", disableActiveInteraction: true, stagePadding: 10, stageRadius: 5 }]
    })
    expect((result.steps[0] as any).disableActiveInteraction).toBeUndefined()
    expect((result.steps[0] as any).stagePadding).toBeUndefined()
    expect((result.steps[0] as any).stageRadius).toBeUndefined()
  })

  it("drops unknown tour-level options", () => {
    const result = sanitizeTourValues({
      steps: [],
      malicious: "value",
      onHighlightStarted: "function() {}"
    })
    expect((result as any).malicious).toBeUndefined()
    expect((result as any).onHighlightStarted).toBeUndefined()
  })
})
