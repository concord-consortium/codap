import { shouldConvertElement, convertHtmlToSvg, parseHtmlContent, getVisibleBackgroundColor } from "./html-to-svg"

const mockBoundingClientRect = (rect: Partial<DOMRect> = {}): DOMRect => {
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

  it("returns false for elements with opacity: 0.0", () => {
    const element = document.createElement("div")
    element.textContent = "Test content"
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ opacity: "0.0" }))

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

describe("parseHtmlContent", () => {
  it("parses plain text into a single line", () => {
    const element = document.createElement("div")
    element.textContent = "Plain text"

    const lines = parseHtmlContent(element)

    expect(lines).toHaveLength(1)
    expect(lines[0].segments).toHaveLength(1)
    expect(lines[0].segments[0].text).toBe("Plain text")
  })

  it("parses <em> tags as italic", () => {
    const element = document.createElement("div")
    element.innerHTML = "Hello <em>world</em>!"

    const lines = parseHtmlContent(element)

    expect(lines).toHaveLength(1)
    expect(lines[0].segments).toHaveLength(3)
    expect(lines[0].segments[0]).toEqual({ text: "Hello " })
    expect(lines[0].segments[1]).toEqual({ text: "world", italic: true })
    expect(lines[0].segments[2]).toEqual({ text: "!" })
  })

  it("parses <sup> tags as superscript", () => {
    const element = document.createElement("div")
    element.innerHTML = "r<sup>2</sup> = 0.95"

    const lines = parseHtmlContent(element)

    expect(lines).toHaveLength(1)
    expect(lines[0].segments).toHaveLength(3)
    expect(lines[0].segments[0]).toEqual({ text: "r" })
    expect(lines[0].segments[1]).toEqual({ text: "2", superscript: true })
    expect(lines[0].segments[2]).toEqual({ text: " = 0.95" })
  })

  it("parses <sub> tags as subscript", () => {
    const element = document.createElement("div")
    element.innerHTML = "σ<sub>slope</sub> = 0.5"

    const lines = parseHtmlContent(element)

    expect(lines).toHaveLength(1)
    expect(lines[0].segments).toHaveLength(3)
    expect(lines[0].segments[0]).toEqual({ text: "σ" })
    expect(lines[0].segments[1]).toEqual({ text: "slope", subscript: true })
    expect(lines[0].segments[2]).toEqual({ text: " = 0.5" })
  })

  it("parses <br> tags as line breaks", () => {
    const element = document.createElement("div")
    element.innerHTML = "Line 1<br>Line 2"

    const lines = parseHtmlContent(element)

    expect(lines).toHaveLength(2)
    expect(lines[0].segments[0].text).toBe("Line 1")
    expect(lines[1].segments[0].text).toBe("Line 2")
  })

  it("parses <br /> self-closing tags as line breaks", () => {
    const element = document.createElement("div")
    element.innerHTML = "Line 1<br />Line 2<br />Line 3"

    const lines = parseHtmlContent(element)

    expect(lines).toHaveLength(3)
    expect(lines[0].segments[0].text).toBe("Line 1")
    expect(lines[1].segments[0].text).toBe("Line 2")
    expect(lines[2].segments[0].text).toBe("Line 3")
  })

  it("parses <span class=\"units\"> as units", () => {
    const element = document.createElement("div")
    element.innerHTML = "5.2 <span class=\"units\">kg</span>"

    const lines = parseHtmlContent(element)

    expect(lines).toHaveLength(1)
    expect(lines[0].segments).toHaveLength(2)
    expect(lines[0].segments[0]).toEqual({ text: "5.2 " })
    expect(lines[0].segments[1]).toEqual({ text: "kg", isUnits: true })
  })

  it("parses <p> elements as separate lines", () => {
    const element = document.createElement("div")
    element.innerHTML = "<p>Paragraph 1</p><p>Paragraph 2</p>"

    const lines = parseHtmlContent(element)

    expect(lines).toHaveLength(2)
    expect(lines[0].segments[0].text).toBe("Paragraph 1")
    expect(lines[1].segments[0].text).toBe("Paragraph 2")
  })

  it("parses <p style=\"color:...\"> with color", () => {
    const element = document.createElement("div")
    element.innerHTML = '<p style="color: red">Red text</p>'

    const lines = parseHtmlContent(element)

    expect(lines).toHaveLength(1)
    expect(lines[0].color).toBe("red")
    expect(lines[0].segments[0].text).toBe("Red text")
  })

  it("parses <p style=\"text-decoration-line:underline\"> with underline", () => {
    const element = document.createElement("div")
    element.innerHTML = '<p style="text-decoration-line: underline">Underlined</p>'

    const lines = parseHtmlContent(element)

    expect(lines).toHaveLength(1)
    expect(lines[0].underline).toBe(true)
    expect(lines[0].segments[0].text).toBe("Underlined")
  })

  it("parses complex formatting like LSRL equation", () => {
    const element = document.createElement("div")
    element.innerHTML = "<em>y</em> = 2.3 <em>x</em> + 1.5<br />r<sup>2</sup> = 0.91"

    const lines = parseHtmlContent(element)

    expect(lines).toHaveLength(2)
    // First line: <em>y</em> = 2.3 <em>x</em> + 1.5
    expect(lines[0].segments.find(s => s.text === "y")?.italic).toBe(true)
    expect(lines[0].segments.find(s => s.text === "x")?.italic).toBe(true)
    // Second line: r<sup>2</sup> = 0.91
    expect(lines[1].segments.find(s => s.text === "2")?.superscript).toBe(true)
  })
})

describe("convertHtmlToSvg with rich formatting", () => {
  let originalGetComputedStyle: typeof window.getComputedStyle

  beforeEach(() => {
    originalGetComputedStyle = window.getComputedStyle
  })

  afterEach(() => {
    window.getComputedStyle = originalGetComputedStyle
  })



  it("creates tspans for italic text (<em>)", () => {
    const element = document.createElement("div")
    element.innerHTML = "Hello <em>world</em>!"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle())

    const result = convertHtmlToSvg({ element })

    expect(result.svgElements).toHaveLength(1)
    const textEl = result.svgElements[0]
    const tspans = textEl.querySelectorAll("tspan")
    expect(tspans).toHaveLength(3)

    // Check the italic tspan
    const italicTspan = Array.from(tspans).find(t => t.textContent === "world")
    expect(italicTspan?.getAttribute("font-style")).toBe("italic")
  })

  it("creates tspans for superscript text (<sup>) and resets baseline", () => {
    const element = document.createElement("div")
    element.innerHTML = "r<sup>2</sup> = 0.95"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle())

    const result = convertHtmlToSvg({ element })

    expect(result.svgElements).toHaveLength(1)
    const textEl = result.svgElements[0]
    const tspans = Array.from(textEl.querySelectorAll("tspan"))

    const supTspan = tspans.find(t => t.textContent === "2")
    expect(supTspan?.getAttribute("dy")).toBe("-0.4em")
    expect(supTspan?.getAttribute("font-size")).toBe("0.7em")

    // The tspan after superscript should reset baseline with inverse offset
    const resetTspan = tspans.find(t => t.textContent === " = 0.95")
    expect(resetTspan?.getAttribute("dy")).toBe("0.4em")
  })

  it("creates tspans for subscript text (<sub>) and resets baseline", () => {
    const element = document.createElement("div")
    element.innerHTML = "σ<sub>slope</sub> = 0.5"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle())

    const result = convertHtmlToSvg({ element })

    expect(result.svgElements).toHaveLength(1)
    const textEl = result.svgElements[0]
    const tspans = Array.from(textEl.querySelectorAll("tspan"))

    const subTspan = tspans.find(t => t.textContent === "slope")
    expect(subTspan?.getAttribute("dy")).toBe("0.3em")
    expect(subTspan?.getAttribute("font-size")).toBe("0.7em")

    // The tspan after subscript should reset baseline with inverse offset
    const resetTspan = tspans.find(t => t.textContent === " = 0.5")
    expect(resetTspan?.getAttribute("dy")).toBe("-0.3em")
  })

  it("creates multiple text elements for <br> tags", () => {
    const element = document.createElement("div")
    element.innerHTML = "Line 1<br>Line 2<br>Line 3"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ fontSize: "12px" }))

    const result = convertHtmlToSvg({ element })

    expect(result.svgElements).toHaveLength(3)

    // Each line should have a different y position
    const y1 = parseFloat(result.svgElements[0].getAttribute("y") || "0")
    const y2 = parseFloat(result.svgElements[1].getAttribute("y") || "0")
    const y3 = parseFloat(result.svgElements[2].getAttribute("y") || "0")

    expect(y2).toBeGreaterThan(y1)
    expect(y3).toBeGreaterThan(y2)
  })

  it("applies gray fill color to units spans", () => {
    const element = document.createElement("div")
    element.innerHTML = '5.2 <span class="units">kg</span>'
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle())

    const result = convertHtmlToSvg({ element })

    expect(result.svgElements).toHaveLength(1)
    const textEl = result.svgElements[0]
    const tspans = textEl.querySelectorAll("tspan")

    const unitsTspan = Array.from(tspans).find(t => t.textContent === "kg")
    expect(unitsTspan?.getAttribute("fill")).toBe("gray")
  })

  it("creates separate text elements for <p> elements", () => {
    const element = document.createElement("div")
    element.innerHTML = "<p>Paragraph 1</p><p>Paragraph 2</p>"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ fontSize: "12px" }))

    const result = convertHtmlToSvg({ element })

    expect(result.svgElements).toHaveLength(2)
  })

  it("applies color from <p style=\"color:...\">", () => {
    const element = document.createElement("div")
    element.innerHTML = '<p style="color: #027d34">Green text</p>'
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle())

    const result = convertHtmlToSvg({ element })

    expect(result.svgElements).toHaveLength(1)
    const textEl = result.svgElements[0]
    const tspans = textEl.querySelectorAll("tspan")

    expect(tspans.length).toBeGreaterThan(0)
    // The color should be applied to the tspan
    expect(tspans[0].getAttribute("fill")).toBe("#027d34")
  })

  it("handles complex LSRL-style equation formatting", () => {
    const element = document.createElement("div")
    element.innerHTML = "<em>y</em> = 2.3 <em>x</em> + 1.5<br />r<sup>2</sup> = 0.91<br />σ<sub>slope</sub> = 0.05"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ fontSize: "12px" }))

    const result = convertHtmlToSvg({ element })

    // Should create 3 text elements (one per line)
    expect(result.svgElements).toHaveLength(3)

    // First line should have italic y and x
    const line1Tspans = result.svgElements[0].querySelectorAll("tspan")
    const yTspan = Array.from(line1Tspans).find(t => t.textContent === "y")
    expect(yTspan?.getAttribute("font-style")).toBe("italic")

    // Second line should have superscript 2
    const line2Tspans = result.svgElements[1].querySelectorAll("tspan")
    const supTspan = Array.from(line2Tspans).find(t => t.textContent === "2")
    expect(supTspan?.getAttribute("dy")).toBe("-0.4em")

    // Third line should have subscript "slope"
    const line3Tspans = result.svgElements[2].querySelectorAll("tspan")
    const subTspan = Array.from(line3Tspans).find(t => t.textContent === "slope")
    expect(subTspan?.getAttribute("dy")).toBe("0.3em")
  })

  it("handles Normal Curve style formatting with underline and color", () => {
    const element = document.createElement("div")
    element.innerHTML = `<p style="text-decoration-line:underline;color:#027d34">Gaussian Fit</p>` +
                       `<p style="color:#027d34">µ = 5.2 <span class="units">kg</span></p>`
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({ fontSize: "12px" }))

    const result = convertHtmlToSvg({ element })

    expect(result.svgElements).toHaveLength(2)

    // First line should have underline and color
    const line1Tspans = result.svgElements[0].querySelectorAll("tspan")
    const underlineTspan = Array.from(line1Tspans).find(t => t.textContent === "Gaussian Fit")
    expect(underlineTspan?.getAttribute("text-decoration")).toBe("underline")
    expect(underlineTspan?.getAttribute("fill")).toBe("#027d34")

    // Second line should have units in gray
    const line2Tspans = result.svgElements[1].querySelectorAll("tspan")
    const unitsTspan = Array.from(line2Tspans).find(t => t.textContent === "kg")
    expect(unitsTspan?.getAttribute("fill")).toBe("gray")
  })

  it("falls back to plain text for elements without rich formatting", () => {
    const element = document.createElement("div")
    element.textContent = "Simple plain text"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle())

    const result = convertHtmlToSvg({ element })

    expect(result.svgElements).toHaveLength(1)
    expect(result.svgElements[0].textContent).toBe("Simple plain text")
    // Should not have tspans for plain text
    expect(result.svgElements[0].querySelectorAll("tspan")).toHaveLength(0)
  })
})

describe("getVisibleBackgroundColor", () => {
  let originalGetComputedStyle: typeof window.getComputedStyle

  beforeEach(() => {
    originalGetComputedStyle = window.getComputedStyle
  })

  afterEach(() => {
    window.getComputedStyle = originalGetComputedStyle
  })

  it("returns null for transparent background", () => {
    const element = document.createElement("div")
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({
      backgroundColor: "rgba(0, 0, 0, 0)"
    }))

    expect(getVisibleBackgroundColor(element)).toBeNull()
  })

  it("returns null for 'transparent' keyword", () => {
    const element = document.createElement("div")
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({
      backgroundColor: "transparent"
    }))

    expect(getVisibleBackgroundColor(element)).toBeNull()
  })

  it("returns the color for non-transparent background", () => {
    const element = document.createElement("div")
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({
      backgroundColor: "rgb(255, 255, 0)"
    }))

    expect(getVisibleBackgroundColor(element)).toBe("rgb(255, 255, 0)")
  })

})

describe("convertHtmlToSvg with background rectangles", () => {
  let originalGetComputedStyle: typeof window.getComputedStyle

  beforeEach(() => {
    originalGetComputedStyle = window.getComputedStyle
  })

  afterEach(() => {
    window.getComputedStyle = originalGetComputedStyle
  })



  it("creates a background rect when element has visible background color", () => {
    const element = document.createElement("div")
    element.textContent = "With background"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({
      backgroundColor: "rgb(255, 255, 0)"
    }))

    const result = convertHtmlToSvg({ element })

    // Should have rect + text
    expect(result.svgElements).toHaveLength(2)
    expect(result.svgElements[0].tagName).toBe("rect")
    expect(result.svgElements[1].tagName).toBe("text")

    // Check rect attributes
    const rect = result.svgElements[0]
    expect(rect.getAttribute("fill")).toBe("rgb(255, 255, 0)")
  })

  it("does not create a background rect when background is transparent", () => {
    const element = document.createElement("div")
    element.textContent = "No background"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({
      backgroundColor: "rgba(0, 0, 0, 0)"
    }))

    const result = convertHtmlToSvg({ element })

    // Should only have text
    expect(result.svgElements).toHaveLength(1)
    expect(result.svgElements[0].tagName).toBe("text")
  })

  it("does not create a background rect when includeBackground is false", () => {
    const element = document.createElement("div")
    element.textContent = "Background disabled"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({
      backgroundColor: "rgb(255, 255, 0)"
    }))

    const result = convertHtmlToSvg({ element, includeBackground: false })

    // Should only have text
    expect(result.svgElements).toHaveLength(1)
    expect(result.svgElements[0].tagName).toBe("text")
  })

  it("positions background rect relative to container", () => {
    const element = document.createElement("div")
    element.textContent = "With background"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({ left: 60, top: 80 }))

    const container = document.createElement("div")
    container.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({ left: 10, top: 30 }))

    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({
      backgroundColor: "yellow"
    }))

    const result = convertHtmlToSvg({ element, containerElement: container })

    const rect = result.svgElements[0]
    // x = (60 - 10) = 50
    expect(rect.getAttribute("x")).toBe("50")
    // y = (80 - 30) = 50
    expect(rect.getAttribute("y")).toBe("50")
  })

  it("applies border radius to background rect", () => {
    const element = document.createElement("div")
    element.textContent = "Rounded"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({
      backgroundColor: "rgb(255, 255, 0)",
      borderRadius: "5px"
    }))

    const result = convertHtmlToSvg({ element })

    const rect = result.svgElements[0]
    expect(rect.getAttribute("rx")).toBe("5")
    expect(rect.getAttribute("ry")).toBe("5")
  })

  it("creates background rect behind rich formatted text", () => {
    const element = document.createElement("div")
    element.innerHTML = "r<sup>2</sup> = 0.95"
    element.getBoundingClientRect = jest.fn(() => mockBoundingClientRect({}))
    window.getComputedStyle = jest.fn(() => mockGetComputedStyle({
      backgroundColor: "lightyellow"
    }))

    const result = convertHtmlToSvg({ element })

    // Should have rect first, then text with tspans
    expect(result.svgElements[0].tagName).toBe("rect")
    expect(result.svgElements[1].tagName).toBe("text")
    expect(result.svgElements[1].querySelectorAll("tspan").length).toBeGreaterThan(0)
  })
})
