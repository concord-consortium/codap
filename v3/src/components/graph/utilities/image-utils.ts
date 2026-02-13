import { PointRendererBase } from "../../data-display/renderer"
import { convertHtmlToSvg, shouldConvertElement } from "./html-to-svg"

const disallowedElementClasses = new Set([
  "axis-legend-attribute-menu",
  "attribute-label-menu",
  "chakra-icon",
  "chakra-menu__menu-list",
  "codap-component-corner",
  "component-minimize-icon",
  "component-resize-handle",
  "droppable-axis",
  "droppable-svg",
  "empty-label",
  "header-right",
])

/**
 * Creates an SVG element containing converted adornment text elements.
 * Queries the content element for HTML text elements with the `svg-export` class,
 * converts them to SVG text elements, and returns an SVG containing all of them.
 *
 * @param contentElement - The graph content element to search for adornment text
 * @returns An SVG element containing the converted text, or null if no text was found
 */
function createAdornmentTextSvg(contentElement: HTMLElement): SVGSVGElement | null {
  const contentRect = contentElement.getBoundingClientRect()
  const convertedElements: SVGElement[] = []

  const elements = contentElement.querySelectorAll(".svg-export")
  for (const element of elements) {
    if (!(element instanceof HTMLElement)) continue
    if (!shouldConvertElement(element)) continue

    try {
      const result = convertHtmlToSvg({
        element,
        containerElement: contentElement
      })
      convertedElements.push(...result.svgElements)
    } catch (e) {
      console.warn("Failed to convert adornment text element:", e)
    }
  }

  if (convertedElements.length === 0) {
    return null
  }

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  svg.setAttribute("width", String(contentRect.width))
  svg.setAttribute("height", String(contentRect.height))

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g")
  group.setAttribute("class", "adornment-text-svg")

  for (const element of convertedElements) {
    group.appendChild(element)
  }
  svg.appendChild(group)

  return svg
}

interface IRenderSvgToCanvasOptions {
  svg: SVGSVGElement
  ctx: CanvasRenderingContext2D
  x?: number
  y?: number
  width: number
  height: number
}

/**
 * Renders an SVG element to a canvas context.
 * Clones the SVG, inlines styles, removes UI elements, and draws to canvas.
 */
async function renderSvgToCanvas(options: IRenderSvgToCanvasOptions): Promise<void> {
  const { svg, ctx, x = 0, y = 0, width, height } = options

  // Clone to avoid modifying the original
  const clone = svg.cloneNode(true) as SVGSVGElement

  // Inline computed styles for text and shape elements BEFORE removing disallowed elements.
  // This ensures index-based matching between clone and original works correctly.
  const elementsToStyle = clone.querySelectorAll("text, line, rect, circle, path, ellipse, polygon, polyline")
  const originalElements = svg.querySelectorAll("text, line, rect, circle, path, ellipse, polygon, polyline")

  elementsToStyle.forEach((el, index) => {
    const original = originalElements[index]
    if (original && el instanceof SVGElement) {
      const computed = window.getComputedStyle(original)
      // Inline key visual properties
      const propsToInline = [
        "fill", "stroke", "stroke-width", "font-family", "font-size", "font-weight",
        "text-anchor", "dominant-baseline", "opacity", "fill-opacity", "stroke-opacity"
      ]
      propsToInline.forEach(prop => {
        const value = computed.getPropertyValue(prop)
        if (value) {
          el.style.setProperty(prop, value)
        }
      })
    }
  })

  // Remove disallowed elements from clone (after style inlining to preserve index matching)
  Array.from(clone.querySelectorAll("*")).forEach(el => {
    const isDisallowed = Array.from(el.classList).some(c => disallowedElementClasses.has(c))
    if (isDisallowed) {
      el.parentElement?.removeChild(el)
    }
  })

  // Set SVG namespace and dimensions
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  clone.setAttribute("width", String(width))
  clone.setAttribute("height", String(height))

  // Serialize to data URL
  const svgString = new XMLSerializer().serializeToString(clone)
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`

  // Load as image and draw to canvas
  await new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, x, y, width, height)
      resolve()
    }
    img.onerror = (e) => {
      console.warn("Failed to render SVG to canvas:", e)
      resolve() // Don't reject - continue with partial export
    }
    img.src = dataUrl
  })
}

// Height of the title area appended below the graph image (matches V2)
export const kTitleAreaHeight = 20

interface IExportGraphToPngOptions {
  graphElement: HTMLElement
  renderer: PointRendererBase
  width: number
  height: number
  dpr?: number
  title?: string
}

interface IExportGraphToCanvasResult {
  canvas: HTMLCanvasElement
  // Logical dimensions (CSS pixels, not scaled by DPR)
  width: number
  height: number
}

/**
 * Composites all graph layers onto a single canvas and returns it.
 * The canvas is scaled by devicePixelRatio for sharp rendering on high-DPI displays,
 * with the context pre-scaled so all drawing uses logical (CSS) coordinates.
 */
async function exportGraphToCanvas(options: IExportGraphToPngOptions): Promise<IExportGraphToCanvasResult> {
  const { graphElement, renderer, width, height, dpr: dprOption, title } = options

  // Find the actual graph content element (the .graph-plot div inside the tile)
  // graphElement may be the tile container which includes the title bar
  const graphContent = graphElement.querySelector(".graph-plot")
  const contentElement = graphContent instanceof HTMLElement ? graphContent : graphElement
  const contentRect = contentElement.getBoundingClientRect()

  // Prefer dimensions from the content element; fall back to the passed width/height
  const exportWidth = contentRect.width || width
  const exportHeight = contentRect.height || height

  // Add extra height for title area if a title is provided (matches V2 behavior)
  const titleHeight = title ? kTitleAreaHeight : 0
  const totalHeight = exportHeight + titleHeight

  // Scale canvas by devicePixelRatio for sharp output on high-DPI displays.
  // Callers can override dpr (e.g. dpr=1) when the image dimensions should match logical size.
  const dpr = dprOption ?? (window.devicePixelRatio || 1)
  const canvas = document.createElement("canvas")
  canvas.width = Math.ceil(exportWidth * dpr)
  canvas.height = Math.ceil(totalHeight * dpr)
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    throw new Error("Failed to get 2D canvas context for PNG export")
  }

  // Scale context so all drawing operations use logical (CSS) coordinates
  ctx.scale(dpr, dpr)

  // 1. Background fill
  ctx.fillStyle = "#f8f8f8"
  ctx.fillRect(0, 0, exportWidth, totalHeight)

  // Cache the graph content's bounding rect to avoid repeated layout calculations
  const graphRect = contentRect

  // 2. Base SVG layer (axes, grid, labels, below-points content)
  const baseSvg = contentElement.querySelector("svg.graph-svg")
  if (baseSvg instanceof SVGSVGElement) {
    try {
      const svgRect = baseSvg.getBoundingClientRect()
      await renderSvgToCanvas({
        svg: baseSvg,
        ctx,
        x: svgRect.left - graphRect.left,
        y: svgRect.top - graphRect.top,
        width: svgRect.width,
        height: svgRect.height
      })
    } catch (e) {
      console.warn("Failed to render graph SVG layer:", e)
    }
  }

  // 3. Points/bars canvas (from renderer)
  // For WebGL (PIXI), we need to use the extract API to get the rendered content
  // For Canvas 2D, we can draw directly from the canvas element
  const pointsCanvas = renderer.canvas
  if (pointsCanvas && pointsCanvas.width > 0 && pointsCanvas.height > 0) {
    try {
      // Get the position of the canvas relative to the graph element
      const canvasRect = pointsCanvas.getBoundingClientRect()
      const canvasX = canvasRect.left - graphRect.left
      const canvasY = canvasRect.top - graphRect.top

      // Check if this is a PIXI renderer (has extract API)
      const pixiRenderer = (renderer as any).renderer
      const pixiStage = (renderer as any).stage
      let sourceCanvas: HTMLCanvasElement | null = null

      if (pixiRenderer?.extract?.canvas && pixiStage) {
        // WebGL/PIXI: Extract the rendered content to a new canvas
        sourceCanvas = pixiRenderer.extract.canvas(pixiStage) as HTMLCanvasElement
      } else {
        // Canvas 2D: Use the canvas directly
        sourceCanvas = pointsCanvas
      }

      if (sourceCanvas) {
        // Canvas uses devicePixelRatio scaling - draw from full size to logical size
        ctx.drawImage(
          sourceCanvas,
          0, 0, sourceCanvas.width, sourceCanvas.height,  // source (DPR-scaled)
          canvasX, canvasY, canvasRect.width, canvasRect.height  // dest (logical size)
        )
      }
    } catch (e) {
      console.warn("Failed to render points canvas:", e)
    }
  }

  // 4. Overlay SVG (above-points content, selection shapes)
  const overlaySvg = contentElement.querySelector("svg.overlay-svg")
  if (overlaySvg instanceof SVGSVGElement) {
    try {
      const svgRect = overlaySvg.getBoundingClientRect()
      await renderSvgToCanvas({
        svg: overlaySvg,
        ctx,
        x: svgRect.left - graphRect.left,
        y: svgRect.top - graphRect.top,
        width: svgRect.width,
        height: svgRect.height
      })
    } catch (e) {
      console.warn("Failed to render overlay SVG layer:", e)
    }
  }

  // 5a. Per-cell adornment SVGs (lines, paths, shapes inside the adornment grid)
  // Adornments render their SVG shapes in per-cell SVGs inside .graph-adornments-grid.
  // In the DOM, .graph-adornments-grid precedes .adornment-spanner, so we draw these
  // first to match the browser's stacking order.
  const adornmentGrid = contentElement.querySelector(".graph-adornments-grid")
  if (adornmentGrid) {
    const cellSvgs = adornmentGrid.querySelectorAll(".adornment-wrapper.visible svg")
    for (const cellSvg of cellSvgs) {
      if (!(cellSvg instanceof SVGSVGElement)) continue
      try {
        const svgRect = cellSvg.getBoundingClientRect()
        // Skip zero-size SVGs (hidden or not yet laid out)
        if (svgRect.width <= 0 || svgRect.height <= 0) continue
        await renderSvgToCanvas({
          svg: cellSvg,
          ctx,
          x: svgRect.left - graphRect.left,
          y: svgRect.top - graphRect.top,
          width: svgRect.width,
          height: svgRect.height
        })
      } catch (e) {
        console.warn("Failed to render adornment cell SVG:", e)
      }
    }
  }

  // 5b. Spanner SVG (adornment-spanner contains elements drawn outside grid cells, e.g. ROI,
  // full-height measure lines). Painted after per-cell SVGs to match DOM stacking order.
  const adornmentSvg = contentElement.querySelector("svg.spanner-svg")
  if (adornmentSvg instanceof SVGSVGElement) {
    try {
      const svgRect = adornmentSvg.getBoundingClientRect()
      await renderSvgToCanvas({
        svg: adornmentSvg,
        ctx,
        x: svgRect.left - graphRect.left,
        y: svgRect.top - graphRect.top,
        width: svgRect.width,
        height: svgRect.height
      })
    } catch (e) {
      console.warn("Failed to render adornments SVG:", e)
    }
  }

  // 6. Adornment text (HTML elements converted to SVG)
  const adornmentTextSvg = createAdornmentTextSvg(contentElement)
  if (adornmentTextSvg) {
    try {
      await renderSvgToCanvas({
        svg: adornmentTextSvg,
        ctx,
        x: 0,
        y: 0,
        width: exportWidth,
        height: exportHeight
      })
    } catch (e) {
      console.warn("Failed to render adornment text SVG:", e)
    }
  }

  // 7. Legend SVG (positioned below the graph area)
  const legendSvgs = contentElement.querySelectorAll("svg.legend-component")
  for (const legendSvg of legendSvgs) {
    if (!(legendSvg instanceof SVGSVGElement)) continue
    try {
      const svgRect = legendSvg.getBoundingClientRect()
      await renderSvgToCanvas({
        svg: legendSvg,
        ctx,
        x: svgRect.left - graphRect.left,
        y: svgRect.top - graphRect.top,
        width: svgRect.width,
        height: svgRect.height
      })
    } catch (e) {
      console.warn("Failed to render legend SVG:", e)
    }
  }

  // 7. Title area below the graph (matches V2 behavior)
  if (title) {
    // White background for title area
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, exportHeight, exportWidth, kTitleAreaHeight)

    // Separator line at the boundary between graph and title
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, exportHeight)
    ctx.lineTo(exportWidth, exportHeight)
    ctx.stroke()

    // Centered title text
    ctx.fillStyle = "#000000"
    ctx.font = '10pt "museo-sans", sans-serif'
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    // +2 nudge matches V2 title placement; compensates for "middle" baseline sitting slightly high
    ctx.fillText(title, exportWidth / 2, exportHeight + kTitleAreaHeight / 2 + 2, exportWidth)
  }

  return { canvas, width: exportWidth, height: totalHeight }
}

/**
 * Exports a graph to PNG by compositing all layers onto a single canvas.
 * Layers (in z-order): background, base SVG, points canvas, overlay SVG, adornments, adornment text, legend.
 * Returns a data URL string.
 */
export async function exportGraphToPng(options: IExportGraphToPngOptions): Promise<string> {
  const { canvas } = await exportGraphToCanvas(options)
  return canvas.toDataURL("image/png")
}

export interface IGraphImageOptions {
  rootEl: HTMLElement
  graphWidth: number
  graphHeight: number
  renderer: PointRendererBase
  dpr?: number
  title?: string
}

interface IGraphSnapshotOptions extends IGraphImageOptions {
  asDataURL: boolean
}

export interface IGraphSnapshotResult {
  image: string | Blob
  width: number
  height: number
}

export const graphSnapshot = async (options: IGraphSnapshotOptions): Promise<IGraphSnapshotResult> => {
  const { rootEl, graphWidth, graphHeight, renderer, asDataURL, dpr, title } = options

  const { canvas, width, height } = await exportGraphToCanvas({
    graphElement: rootEl,
    renderer,
    width: graphWidth,
    height: graphHeight,
    dpr,
    title
  })

  if (asDataURL) {
    return { image: canvas.toDataURL("image/png"), width, height }
  }

  // Use canvas.toBlob() directly instead of round-tripping through a data URL
  return new Promise<IGraphSnapshotResult>((resolve, reject) => {
    canvas.toBlob(
      (blob: Blob | null) => blob
        ? resolve({ image: blob, width, height })
        : reject(new Error("Failed to create PNG blob")),
      "image/png"
    )
  })
}
