/**
 * HTML-to-SVG Conversion Utility
 *
 * Converts HTML text elements to SVG at export time.
 * This allows adornment text (equations, labels, counts) to be included in PNG/SVG exports.
 *
 * The conversion happens only during export—live rendering remains unchanged.
 */

export interface IHtmlToSvgOptions {
  // Container element for calculating relative positions. If not provided, absolute positions are used.
  containerElement?: HTMLElement
  // The HTML element to convert
  element: HTMLElement
}

export interface IHtmlToSvgResult {
  bounds: DOMRect
  svgElements: SVGElement[]
}

const excludedClasses = new Set([
  "confidence-bands-tip",
  "data-tip",
  "graph-d3-tip",
  "tooltip",
])

/**
 * Checks whether an HTML element should be converted to SVG for export.
 *
 * Elements are excluded if they are:
 * - Hidden (display: none, visibility: hidden, or opacity: 0)
 * - Tooltip elements (have excluded class names)
 * - Empty (no text content)
 *
 * @param element - The HTML element to check
 * @returns true if the element should be converted, false otherwise
 */
export function shouldConvertElement(element: HTMLElement): boolean {
  const textContent = element.textContent?.trim()
  if (!textContent) {
    return false
  }

  for (const className of element.classList) {
    if (excludedClasses.has(className)) {
      return false
    }
  }

  const computedStyle = window.getComputedStyle(element)
  if (computedStyle.display === "none" || computedStyle.visibility === "hidden" || computedStyle.opacity === "0") {
    return false
  }

  return true
}

/**
 * Maps CSS text-align values to SVG text-anchor values
 */
function mapTextAlignToAnchor(textAlign: string): string {
  switch (textAlign) {
    case "center":
      return "middle"
    case "right":
    case "end":
      return "end"
    case "left":
    case "start":
    default:
      return "start"
  }
}

/**
 * Calculates the x-coordinate for SVG text based on alignment and element bounds
 */
function calculateTextX(
  elementRect: DOMRect,
  containerRect: DOMRect | null,
  textAnchor: string
): number {
  const relativeLeft = containerRect ? elementRect.left - containerRect.left : elementRect.left

  switch (textAnchor) {
    case "middle":
      return relativeLeft + elementRect.width / 2
    case "end":
      return relativeLeft + elementRect.width
    case "start":
    default:
      return relativeLeft
  }
}

/**
 * Extracts font size in pixels from a computed style font-size value.
 * Falls back to 12 if parsing fails.
 */
function parseFontSize(fontSizeValue: string): number {
  const parsed = parseFloat(fontSizeValue)
  return isNaN(parsed) ? 12 : parsed
}

/**
 * Creates an SVG namespace element
 */
function createSvgElement<K extends keyof SVGElementTagNameMap>(tagName: K): SVGElementTagNameMap[K] {
  return document.createElementNS("http://www.w3.org/2000/svg", tagName)
}

/**
 * Converts an HTML element containing plain text to an SVG text element.
 *
 * This function reads position from the LIVE DOM using getBoundingClientRect(),
 * extracts computed styles, and generates an SVG <text> element with equivalent
 * visual properties.
 *
 * Phase 1 implementation handles plain text only. Rich formatting (subscripts,
 * superscripts, italics, etc.) will be added in Phase 3.
 *
 * @param options - Conversion options including the element and optional container
 * @returns Object containing the generated SVG elements and the original element bounds
 */
export function convertHtmlToSvg(options: IHtmlToSvgOptions): IHtmlToSvgResult {
  const { element, containerElement } = options
  const elementRect = element.getBoundingClientRect()
  const containerRect = containerElement?.getBoundingClientRect() ?? null
  const computedStyle = window.getComputedStyle(element)
  const textContent = element.textContent?.trim() ?? ""
  const svgText = createSvgElement("text")

  // Calculate position
  // SVG text y-coordinate is baseline, not top. Add ~80% of font size to approximate baseline.
  const fontSize = parseFontSize(computedStyle.fontSize)
  const baselineOffset = fontSize * 0.8

  const relativeTop = containerRect
    ? elementRect.top - containerRect.top
    : elementRect.top

  // Map text alignment to SVG text-anchor
  const textAnchor = mapTextAlignToAnchor(computedStyle.textAlign)
  const x = calculateTextX(elementRect, containerRect, textAnchor)
  const y = relativeTop + baselineOffset

  svgText.setAttribute("x", String(x))
  svgText.setAttribute("y", String(y))

  // Set text-anchor for alignment
  if (textAnchor !== "start") {
    svgText.setAttribute("text-anchor", textAnchor)
  }

  // Set font properties with fallback system fonts
  const fontFamily = computedStyle.fontFamily ||
    "Lato, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
  svgText.setAttribute("font-family", fontFamily)
  svgText.setAttribute("font-size", `${fontSize}px`)

  if (computedStyle.fontWeight && computedStyle.fontWeight !== "400" && computedStyle.fontWeight !== "normal") {
    svgText.setAttribute("font-weight", computedStyle.fontWeight)
  }

  if (computedStyle.fontStyle && computedStyle.fontStyle !== "normal") {
    svgText.setAttribute("font-style", computedStyle.fontStyle)
  }

  const color = computedStyle.color
  if (color) {
    svgText.setAttribute("fill", color)
  }

  svgText.textContent = textContent

  return {
    svgElements: [svgText],
    bounds: elementRect
  }
}

export function hasExportableClass(element: HTMLElement): boolean {
  return element.classList.contains("svg-exportable")
}
