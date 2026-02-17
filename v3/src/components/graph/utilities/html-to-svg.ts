/**
 * HTML-to-SVG Conversion Utility
 *
 * Converts HTML text elements to SVG at export time.
 * This allows adornment text (equations, labels, counts) to be included in PNG/SVG exports.
 *
 * The conversion happens only during export—live rendering remains unchanged.
 */

export interface IHtmlToSvgOptions {
  baselineOffsetFactor?: number
  // Container element for calculating relative positions. If not provided, absolute positions are used.
  containerElement?: HTMLElement
  // The HTML element to convert
  element: HTMLElement
  fallbackFontSize?: number
  includeBackground?: boolean
}

export interface IHtmlToSvgResult {
  bounds: DOMRect
  svgElements: SVGElement[]
}

interface ITextSegment {
  color?: string
  isUnits?: boolean
  italic?: boolean
  text: string
  subscript?: boolean
  superscript?: boolean
  underline?: boolean
}

interface ITextLine {
  color?: string
  segments: ITextSegment[]
  underline?: boolean
}

const DEFAULT_FONT_SIZE = 12
const DEFAULT_BASELINE_RATIO = 0.8
const UNITS_COLOR = "gray"
const SUPERSCRIPT_DY = "-0.4em"
const SUPERSCRIPT_RESET_DY = "0.4em"
const SUBSCRIPT_DY = "0.3em"
const SUBSCRIPT_RESET_DY = "-0.3em"
const SUP_TO_SUB_DY = "0.7em"   // reset from sup (+0.4) + apply sub (+0.3)
const SUB_TO_SUP_DY = "-0.7em"  // reset from sub (-0.3) + apply sup (-0.4)
const SUPER_SUB_FONT_SIZE = "0.7em"

/**
 * Checks whether an HTML element should be converted to SVG for export.
 *
 * Elements are excluded if they are:
 * - Hidden (display: none, visibility: hidden, or opacity: 0)
 * - Marked with the `no-svg-export` class (tooltips, temporary UI elements)
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

  if (element.classList.contains("no-svg-export")) {
    return false
  }

  const computedStyle = window.getComputedStyle(element)
  const opacity = parseFloat(computedStyle.opacity)
  if (
    computedStyle.display === "none" ||
    computedStyle.visibility === "hidden" ||
    (!Number.isNaN(opacity) && opacity <= 0)
  ) {
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
 */
function parseFontSize(fontSizeValue: string, fallbackFontSize: number): number {
  const parsed = parseFloat(fontSizeValue)
  return isNaN(parsed) ? fallbackFontSize : parsed
}

/**
 * Creates an SVG namespace element
 */
function createSvgElement<K extends keyof SVGElementTagNameMap>(tagName: K): SVGElementTagNameMap[K] {
  return document.createElementNS("http://www.w3.org/2000/svg", tagName)
}

/**
 * Checks if a color is "transparent" or effectively invisible.
 */
function isTransparentColor(color: string): boolean {
  if (!color) return true

  const lower = color.toLowerCase()
  if (lower === "transparent" || lower === "rgba(0, 0, 0, 0)") return true

  // Check for rgba with 0 alpha
  const rgbaMatch = lower.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(\d*\.?\d+)\s*\)/)
  if (rgbaMatch && parseFloat(rgbaMatch[1]) === 0) return true

  return false
}

/**
 * Determines if an element has a visible background that should be rendered as an SVG rect.
 * Returns the background color if visible, null otherwise.
 */
export function getVisibleBackgroundColor(element: HTMLElement): string | null {
  const computedStyle = window.getComputedStyle(element)
  const bgColor = computedStyle.backgroundColor

  // Return background color if it's visible (not transparent)
  return isTransparentColor(bgColor) ? null : bgColor
}

/**
 * Creates an SVG rect element for a background.
 */
function createBackgroundRect(
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: string,
  borderRadius?: number
): SVGRectElement {
  const rect = createSvgElement("rect")
  rect.setAttribute("x", String(x))
  rect.setAttribute("y", String(y))
  rect.setAttribute("width", String(width))
  rect.setAttribute("height", String(height))
  rect.setAttribute("fill", fillColor)

  if (borderRadius) {
    rect.setAttribute("rx", String(borderRadius))
    rect.setAttribute("ry", String(borderRadius))
  }

  return rect
}

/**
 * Parses inline style attribute to extract color and text-decoration.
 */
function parseInlineStyle(styleAttr: string | null): { color?: string, underline?: boolean } {
  if (!styleAttr) return {}
  const result: { color?: string, underline?: boolean } = {}

  const colorMatch = styleAttr.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)
  if (colorMatch) {
    result.color = colorMatch[1].trim()
  }

  if (styleAttr.includes("underline")) {
    result.underline = true
  }

  return result
}

/**
 * Recursively processes HTML nodes and extracts text segments with formatting.
 */
function processNode(
  node: Node,
  inheritedStyles: { italic?: boolean, superscript?: boolean, subscript?: boolean,
                     color?: string, underline?: boolean, isUnits?: boolean }
): ITextSegment[] {
  const segments: ITextSegment[] = []

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || ""
    if (text) {
      segments.push({
        text,
        ...inheritedStyles
      })
    }
    return segments
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as HTMLElement
    const tagName = element.tagName.toLowerCase()
    const newStyles = { ...inheritedStyles }

    switch (tagName) {
      case "em":
      case "i":
        newStyles.italic = true
        break
      case "sup":
        newStyles.superscript = true
        break
      case "sub":
        newStyles.subscript = true
        break
      case "span": {
        if (element.classList.contains("units")) {
          newStyles.isUnits = true
        }
        // Parse inline styles on <span> elements
        const spanStyle = parseInlineStyle(element.getAttribute("style"))
        if (spanStyle.color) newStyles.color = spanStyle.color
        if (spanStyle.underline) newStyles.underline = true
        break
      }
    }

    for (const child of Array.from(node.childNodes)) {
      segments.push(...processNode(child, newStyles))
    }
  }

  return segments
}

/**
 * Parses HTML content and returns lines of text segments.
 * Lines are separated by <br> tags or <p> elements.
 */
export function parseHtmlContent(element: HTMLElement): ITextLine[] {
  const lines: ITextLine[] = []
  let currentLine: ITextLine = { segments: [] }

  function processChildNodes(parent: Node, inheritedStyles: { color?: string, underline?: boolean } = {}) {
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        const tagName = el.tagName.toLowerCase()

        if (tagName === "br") {
          // Start a new line. The guard skips empty lines (except the first) to avoid
          // blank lines from consecutive <br> tags. CODAP adornments don't produce
          // consecutive <br> tags, so this doesn't affect actual output.
          if (currentLine.segments.length > 0 || lines.length === 0) {
            lines.push(currentLine)
          }
          currentLine = { segments: [], ...inheritedStyles }
          continue
        }

        if (tagName === "p") {
          // Start a new line
          if (currentLine.segments.length > 0) {
            lines.push(currentLine)
          }
          const pStyle = parseInlineStyle(el.getAttribute("style"))
          currentLine = {
            segments: [],
            color: pStyle.color || inheritedStyles.color,
            underline: pStyle.underline || inheritedStyles.underline
          }
          processChildNodes(el, { color: pStyle.color, underline: pStyle.underline })
          if (currentLine.segments.length > 0) {
            lines.push(currentLine)
          }
          currentLine = { segments: [], ...inheritedStyles }
          continue
        }

        // Process other elements via processNode (handles em, sup, sub, span, etc.).
        // Note: <br> nested inside inline elements (e.g. <em>A<br/>B</em>) won't produce
        // a line break since processNode doesn't handle <br>. This is acceptable because
        // CODAP adornments only use <br> as a sibling of inline elements.
        const segments = processNode(node, inheritedStyles)
        currentLine.segments.push(...segments)
      } else if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || ""
        if (text) {
          currentLine.segments.push({ text, ...inheritedStyles })
        }
      }
    }
  }

  processChildNodes(element)

  // Add the last line if it has content
  if (currentLine.segments.length > 0) {
    lines.push(currentLine)
  }

  // If no lines were created but there's text content, create a single line
  if (lines.length === 0 && element.textContent?.trim()) {
    lines.push({ segments: [{ text: element.textContent.trim() }] })
  }

  return lines
}

/**
 * Creates SVG tspan elements for a line of text segments.
 * Handles superscript/subscript positioning with dy offsets.
 */
function createTspansForLine(line: ITextLine): SVGTSpanElement[] {
  const tspans: SVGTSpanElement[] = []
  let lastVerticalOffset: "superscript" | "subscript" | null = null

  for (const segment of line.segments) {
    if (!segment.text) continue

    const tspan = createSvgElement("tspan")
    tspan.textContent = segment.text

    if (segment.italic) {
      tspan.setAttribute("font-style", "italic")
    }

    // Handle vertical positioning (superscript, subscript, and transitions between them).
    // SVG dy is cumulative, so we must account for the current offset state when transitioning.
    if (segment.superscript) {
      if (lastVerticalOffset !== "superscript") {
        const dy = lastVerticalOffset === "subscript" ? SUB_TO_SUP_DY : SUPERSCRIPT_DY
        tspan.setAttribute("dy", dy)
      }
      tspan.setAttribute("font-size", SUPER_SUB_FONT_SIZE)
      lastVerticalOffset = "superscript"
    } else if (segment.subscript) {
      if (lastVerticalOffset !== "subscript") {
        const dy = lastVerticalOffset === "superscript" ? SUP_TO_SUB_DY : SUBSCRIPT_DY
        tspan.setAttribute("dy", dy)
      }
      tspan.setAttribute("font-size", SUPER_SUB_FONT_SIZE)
      lastVerticalOffset = "subscript"
    } else if (lastVerticalOffset) {
      const resetDy = lastVerticalOffset === "superscript"
        ? SUPERSCRIPT_RESET_DY
        : SUBSCRIPT_RESET_DY
      tspan.setAttribute("dy", resetDy)
      lastVerticalOffset = null
    }

    // Apply color - units get gray, others inherit or use specified color
    if (segment.isUnits) {
      tspan.setAttribute("fill", UNITS_COLOR)
    } else {
      const fillColor = segment.color || line.color
      if (fillColor) {
        tspan.setAttribute("fill", fillColor)
      }
    }

    // Apply underline via text-decoration
    if (segment.underline || line.underline) {
      tspan.setAttribute("text-decoration", "underline")
    }

    tspans.push(tspan)
  }

  return tspans
}

/**
 * Checks if HTML content has rich formatting (tags other than plain text).
 */
function hasRichFormatting(element: HTMLElement): boolean {
  const html = element.innerHTML
  return /<(em|i|sup|sub|br|span|p)\b/i.test(html)
}

/**
 * Converts an HTML element to SVG text element(s).
 *
 * This function reads position from the LIVE DOM using getBoundingClientRect(),
 * extracts computed styles, and generates SVG <text> element(s) with equivalent
 * visual properties.
 *
 * Supports rich formatting including:
 * - `<em>` / `<i>` → italic text via `<tspan font-style="italic">`
 * - `<sup>` → superscript via `<tspan dy="-0.4em" font-size="0.7em">`
 * - `<sub>` → subscript via `<tspan dy="0.3em" font-size="0.7em">`
 * - `<br>` → new `<text>` element with adjusted y position
 * - `<span class="units">` → gray text via `<tspan fill="gray">`
 * - `<p style="color:...">` → colored text via `<tspan fill="...">`
 * - `<p style="text-decoration:underline">` → underlined text
 *
 * @param options - Conversion options including the element and optional container
 * @returns Object containing the generated SVG elements and the original element bounds
 */
export function convertHtmlToSvg(options: IHtmlToSvgOptions): IHtmlToSvgResult {
  const { element, containerElement, baselineOffsetFactor = DEFAULT_BASELINE_RATIO,
    fallbackFontSize = DEFAULT_FONT_SIZE, includeBackground = true } = options
  const elementRect = element.getBoundingClientRect()
  const containerRect = containerElement?.getBoundingClientRect() ?? null
  const computedStyle = window.getComputedStyle(element)

  // Calculate base positioning
  const fontSize = parseFontSize(computedStyle.fontSize, fallbackFontSize)
  const baselineOffset = fontSize * baselineOffsetFactor
  const lineHeight = fontSize * 1.2  // Approximate line height for multi-line text

  const relativeTop = containerRect
    ? elementRect.top - containerRect.top
    : elementRect.top

  const textAnchor = mapTextAlignToAnchor(computedStyle.textAlign)
  const x = calculateTextX(elementRect, containerRect, textAnchor)
  const baseY = relativeTop + baselineOffset

  // Font properties (shared across all text elements)
  const fontFamily = computedStyle.fontFamily || "Lato, Helvetica, Arial, sans-serif"
  const fontWeight = computedStyle.fontWeight
  const fontStyle = computedStyle.fontStyle
  const color = computedStyle.color

  // Helper to apply common attributes to a text element
  const applyCommonAttributes = (textEl: SVGTextElement, yPos: number) => {
    textEl.setAttribute("x", String(x))
    textEl.setAttribute("y", String(yPos))

    if (textAnchor !== "start") {
      textEl.setAttribute("text-anchor", textAnchor)
    }

    textEl.setAttribute("font-family", fontFamily)
    textEl.setAttribute("font-size", `${fontSize}px`)

    if (fontWeight && fontWeight !== "400" && fontWeight !== "normal") {
      textEl.setAttribute("font-weight", fontWeight)
    }

    if (fontStyle && fontStyle !== "normal") {
      textEl.setAttribute("font-style", fontStyle)
    }

    if (color) {
      textEl.setAttribute("fill", color)
    }
  }

  // Check for background color to create a rect
  const svgElements: SVGElement[] = []
  const backgroundColor = includeBackground ? getVisibleBackgroundColor(element) : null

  if (backgroundColor) {
    const relativeLeft = containerRect
      ? elementRect.left - containerRect.left
      : elementRect.left
    const borderRadius = parseFloat(computedStyle.borderRadius) || 0
    const backgroundRect = createBackgroundRect(
      relativeLeft,
      relativeTop,
      elementRect.width,
      elementRect.height,
      backgroundColor,
      borderRadius
    )
    svgElements.push(backgroundRect)
  }

  if (!hasRichFormatting(element)) {
    const svgText = createSvgElement("text")
    applyCommonAttributes(svgText, baseY)
    svgText.textContent = element.textContent?.trim() ?? ""
    svgElements.push(svgText)
    return {
      svgElements,
      bounds: elementRect
    }
  }

  const lines = parseHtmlContent(element)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const yPos = baseY + (i * lineHeight)
    const svgText = createSvgElement("text")
    applyCommonAttributes(svgText, yPos)

    // Create tspans for the line's segments
    const tspans = createTspansForLine(line)

    if (tspans.length === 0) {
      // Empty line - add a space to preserve the line
      svgText.textContent = " "
    } else {
      for (const tspan of tspans) {
        svgText.appendChild(tspan)
      }
    }

    svgElements.push(svgText)
  }

  // If only background rect was created (no text elements), add a fallback text
  if (svgElements.length === (backgroundColor ? 1 : 0)) {
    const svgText = createSvgElement("text")
    applyCommonAttributes(svgText, baseY)
    svgText.textContent = element.textContent?.trim() ?? ""
    svgElements.push(svgText)
  }

  return {
    svgElements,
    bounds: elementRect
  }
}
