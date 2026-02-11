import { shouldConvertElement, convertHtmlToSvg } from "./html-to-svg"

const mockGetComputedStyle = (overrides: Partial<CSSStyleDeclaration> = {}): CSSStyleDeclaration => {
  return {
    color: "rgb(0, 0, 0)",
    display: "block",
    fontFamily: "Lato, sans-serif",
    fontSize: "12px",
    fontStyle: "normal",
    fontWeight: "400",
    opacity: "1",
    textAlign: "left",
    visibility: "visible",
    ...overrides
  } as CSSStyleDeclaration
}

describe("shouldConvertElement", () => {
  let originalGetComputedStyle: typeof window.getComputedStyle

  beforeEach(() => {
    originalGetComputedStyle = window.getComputedStyle
  })

  afterEach(() => {
    window.getComputedStyle = originalGetComputedStyle
  })

  it("returns true for visible elements with text content", () => {
    const element = document.createElement("div")
    element.textContent = "Test content"
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle())

    expect(shouldConvertElement(element)).toBe(true)
  })

  it("returns false for elements with no text content", () => {
    const element = document.createElement("div")
    element.textContent = ""
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle())

    expect(shouldConvertElement(element)).toBe(false)
  })

  it("returns false for elements with only whitespace", () => {
    const element = document.createElement("div")
    element.textContent = "   \n\t  "
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle())

    expect(shouldConvertElement(element)).toBe(false)
  })

  it("returns false for elements with display: none", () => {
    const element = document.createElement("div")
    element.textContent = "Test content"
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ display: "none" }))

    expect(shouldConvertElement(element)).toBe(false)
  })

  it("returns false for elements with visibility: hidden", () => {
    const element = document.createElement("div")
    element.textContent = "Test content"
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ visibility: "hidden" }))

    expect(shouldConvertElement(element)).toBe(false)
  })

  it("returns false for elements with opacity: 0", () => {
    const element = document.createElement("div")
    element.textContent = "Test content"
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ opacity: "0" }))

    expect(shouldConvertElement(element)).toBe(false)
  })

  it("returns false for elements with no-svg-export class", () => {
    const element = document.createElement("div")
    element.textContent = "Tooltip content"
    element.classList.add("no-svg-export")
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle())

    expect(shouldConvertElement(element)).toBe(false)
  })

  it("returns true for elements with other classes but not no-svg-export", () => {
    const element = document.createElement("div")
    element.textContent = "Valid content"
    element.classList.add("some-other-class")
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle())

    expect(shouldConvertElement(element)).toBe(true)
  })
})

describe("convertHtmlToSvg", () => {
  let originalGetComputedStyle: typeof window.getComputedStyle

  beforeEach(() => {
    originalGetComputedStyle = window.getComputedStyle
  })

  afterEach(() => {
    window.getComputedStyle = originalGetComputedStyle
  })

  const mockBoundingClientRect = (rect: Partial<DOMRect>): DOMRect => {
    return {
      bottom: 100,
      height: 20,
      left: 0,
      right: 100,
      top: 0,
      x: 0,
      y: 0,
      width: 100,
      toJSON: () => ({}),
      ...rect
    } as DOMRect
  }

  it("creates an SVG text element with correct content", () => {
    const element = document.createElement("div")
    element.textContent = "Hello World"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({ top: 50, left: 100 }))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle())

    const result = convertHtmlToSvg({ element })

    expect(result.svgElements).toHaveLength(1)
    expect(result.svgElements[0].tagName).toBe("text")
    expect(result.svgElements[0].textContent).toBe("Hello World")
  })

  it("sets correct position attributes", () => {
    const element = document.createElement("div")
    element.textContent = "Test"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({ top: 50, left: 100 }))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ fontSize: "16px" }))

    const result = convertHtmlToSvg({ element })
    const svgText = result.svgElements[0]

    expect(svgText.getAttribute("x")).toBe("100")
    // y = top + (fontSize * 0.8) = 50 + 12.8 = 62.8
    expect(svgText.getAttribute("y")).toBe("62.8")
  })

  it("calculates position relative to container element", () => {
    const element = document.createElement("div")
    element.textContent = "Test"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({ top: 150, left: 200 }))

    const container = document.createElement("div")
    container.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({ top: 100, left: 50 }))

    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ fontSize: "12px" }))

    const result = convertHtmlToSvg({ element, containerElement: container })
    const svgText = result.svgElements[0]

    // Relative position: 200 - 50 = 150 for x
    expect(svgText.getAttribute("x")).toBe("150")
    // Relative position: 150 - 100 = 50, plus baseline offset: 50 + 9.6 = 59.6
    expect(svgText.getAttribute("y")).toBe("59.6")
  })

  it("sets font-family attribute", () => {
    const element = document.createElement("div")
    element.textContent = "Test"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({
      fontFamily: "Arial, Helvetica, sans-serif"
    }))

    const result = convertHtmlToSvg({ element })
    const svgText = result.svgElements[0]

    expect(svgText.getAttribute("font-family")).toBe("Arial, Helvetica, sans-serif")
  })

  it("sets font-size attribute", () => {
    const element = document.createElement("div")
    element.textContent = "Test"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ fontSize: "14px" }))

    const result = convertHtmlToSvg({ element })
    const svgText = result.svgElements[0]

    expect(svgText.getAttribute("font-size")).toBe("14px")
  })

  it("sets font-weight attribute when not normal", () => {
    const element = document.createElement("div")
    element.textContent = "Test"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ fontWeight: "700" }))

    const result = convertHtmlToSvg({ element })
    const svgText = result.svgElements[0]

    expect(svgText.getAttribute("font-weight")).toBe("700")
  })

  it("does not set font-weight attribute when normal (400)", () => {
    const element = document.createElement("div")
    element.textContent = "Test"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ fontWeight: "400" }))

    const result = convertHtmlToSvg({ element })
    const svgText = result.svgElements[0]

    expect(svgText.getAttribute("font-weight")).toBeNull()
  })

  it("sets font-style attribute when italic", () => {
    const element = document.createElement("div")
    element.textContent = "Test"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ fontStyle: "italic" }))

    const result = convertHtmlToSvg({ element })
    const svgText = result.svgElements[0]

    expect(svgText.getAttribute("font-style")).toBe("italic")
  })

  it("does not set font-style attribute when normal", () => {
    const element = document.createElement("div")
    element.textContent = "Test"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ fontStyle: "normal" }))

    const result = convertHtmlToSvg({ element })
    const svgText = result.svgElements[0]

    expect(svgText.getAttribute("font-style")).toBeNull()
  })

  it("sets fill color from text color", () => {
    const element = document.createElement("div")
    element.textContent = "Test"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ color: "rgb(255, 0, 0)" }))

    const result = convertHtmlToSvg({ element })
    const svgText = result.svgElements[0]

    expect(svgText.getAttribute("fill")).toBe("rgb(255, 0, 0)")
  })

  it("maps text-align center to text-anchor middle", () => {
    const element = document.createElement("div")
    element.textContent = "Test"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({ left: 100, width: 200 }))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ textAlign: "center" }))

    const result = convertHtmlToSvg({ element })
    const svgText = result.svgElements[0]

    expect(svgText.getAttribute("text-anchor")).toBe("middle")
    // x should be center of element: 100 + 200/2 = 200
    expect(svgText.getAttribute("x")).toBe("200")
  })

  it("maps text-align right to text-anchor end", () => {
    const element = document.createElement("div")
    element.textContent = "Test"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({ left: 100, width: 200 }))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ textAlign: "right" }))

    const result = convertHtmlToSvg({ element })
    const svgText = result.svgElements[0]

    expect(svgText.getAttribute("text-anchor")).toBe("end")
    // x should be right edge: 100 + 200 = 300
    expect(svgText.getAttribute("x")).toBe("300")
  })

  it("does not set text-anchor for left alignment (default)", () => {
    const element = document.createElement("div")
    element.textContent = "Test"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ textAlign: "left" }))

    const result = convertHtmlToSvg({ element })
    const svgText = result.svgElements[0]

    expect(svgText.getAttribute("text-anchor")).toBeNull()
  })

  it("returns the original element bounds", () => {
    const element = document.createElement("div")
    element.textContent = "Test"
    const mockRect = mockBoundingClientRect({ top: 10, left: 20, width: 100, height: 30 })
    element.getBoundingClientRect = jest.fn(() => mockRect)
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle())

    const result = convertHtmlToSvg({ element })

    expect(result.bounds).toBe(mockRect)
  })

  it("handles empty text content gracefully", () => {
    const element = document.createElement("div")
    element.textContent = ""
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle())

    const result = convertHtmlToSvg({ element })

    expect(result.svgElements[0].textContent).toBe("")
  })

  it("uses fallback font family when none specified", () => {
    const element = document.createElement("div")
    element.textContent = "Test"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ fontFamily: "" }))

    const result = convertHtmlToSvg({ element })
    const svgText = result.svgElements[0]

    expect(svgText.getAttribute("font-family")).toContain("Lato")
    expect(svgText.getAttribute("font-family")).toContain("sans-serif")
  })

  it("uses fallback font size when parsing fails", () => {
    const element = document.createElement("div")
    element.textContent = "Test"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({ top: 0 }))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ fontSize: "invalid" }))

    const result = convertHtmlToSvg({ element })
    const svgText = result.svgElements[0]

    expect(svgText.getAttribute("font-size")).toBe("12px")
    // Baseline offset should use fallback: 12 * 0.8 = 9.6
    expect(parseFloat(svgText.getAttribute("y") ?? "0")).toBeCloseTo(9.6)
  })
})
