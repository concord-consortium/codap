import { Map } from "leaflet"
import { PixiPoints } from "../../data-display/pixi/pixi-points"
import leafletImage from "leaflet-image"

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

export interface IGraphSvgOptions {
  rootEl: HTMLElement
  graphWidth: number
  graphHeight: number
  pixiPoints: PixiPoints
  map?: Map
  backgroundImageUrl?: string
}

function createLeafletImageCanvas(map?: Map): Promise<HTMLCanvasElement|undefined> {
  if (!map) {
    return Promise.resolve(undefined)
  }

  return new Promise((resolve, reject) => {
    leafletImage(map, function(err: Error | null, leafletCanvas: HTMLCanvasElement | null) {
      if (err) {
        reject(err)
      } else if (leafletCanvas) {
        resolve(leafletCanvas)
      } else {
        reject(new Error("Leaflet image generation failed without error"))
      }
    })
  })
}

export function graphSvg(options: IGraphSvgOptions): string {
  const { rootEl, graphWidth, graphHeight, pixiPoints, backgroundImageUrl } = options
  // Gather CSS styles
  const getCssText = (): string => {
    const text: string[] = []
    for (let ix = 0; ix < document.styleSheets.length; ix++) {
      try {
        const styleSheet = document.styleSheets[ix]
        if (styleSheet) {
          const rules = styleSheet.rules || styleSheet.cssRules || []
          for (let jx = 0; jx < rules.length; jx++) {
            const rule = rules[jx]
            text.push(rule.cssText)
          }
        }
      } catch (ex) {
        console.warn(`Exception retrieving stylesheet: ${ex}`)
      }
    }
    return text.join("\n")
  }
  const css = document.createElement("style")
  css.textContent = getCssText()

  // Append some custom rules to improve the output -- hopefully we can make this unnecessary later.
  css.textContent += `
    .png-container {
      font-family: Montserrat, sans-serif;
    }
    .grid .tick line {
      stroke: rgb(211, 211, 211);
      stroke-opacity: 0.7;
    }
    line.divider, line.axis-line {
      height: 1px;
      stroke: rgb(211, 211, 211);
    }
    text.category-label {
      fill: black;
      font-family: arial, helvetica, sans-serif;
      font-size: 9px;
    }
  `

  /**
   * Converts a PixiJS canvas to an SVG image element.
   * @param _foreignObject {SVGForeignObjectElement} The foreignObject element containing the PixiJS canvas.
   * @returns {SVGImageElement | undefined} An SVG image element representing the PixiJS canvas, or undefined.
   */
  const imageFromPixiCanvas = (_foreignObject: SVGForeignObjectElement): SVGImageElement | undefined => {
    const extractedCanvas = pixiPoints.renderer?.extract.canvas(pixiPoints.stage)
    if (!extractedCanvas?.toDataURL) return

    const _width = _foreignObject.getAttribute("width") ?? extractedCanvas.width.toString()
    const _height = _foreignObject.getAttribute("height") ?? extractedCanvas.height.toString()
    const x = _foreignObject.getAttribute("x") || "0"
    const y = _foreignObject.getAttribute("y") || "0"
    const dataURL = extractedCanvas.toDataURL("image/png")
    const image = document.createElementNS("http://www.w3.org/2000/svg", "image")
    image.setAttributeNS(null, "href", dataURL)
    image.setAttributeNS(null, "x", x)
    image.setAttributeNS(null, "y", y)
    image.setAttributeNS(null, "width", _width)
    image.setAttributeNS(null, "height", _height)

    return image
  }

  // Create SVG with foreignObject
  const svgNS = "http://www.w3.org/2000/svg"
  const xhtmlNS = "http://www.w3.org/1999/xhtml"
  const svg = document.createElementNS(svgNS, "svg")
  svg.setAttribute("width", graphWidth.toString())
  svg.setAttribute("height", graphHeight.toString())

  const foreignObject = document.createElementNS(svgNS, "foreignObject")
  foreignObject.setAttribute("x", "0")
  foreignObject.setAttribute("y", "0")
  foreignObject.setAttribute("width", graphWidth.toString())
  foreignObject.setAttribute("height", graphHeight.toString())
  foreignObject.appendChild(css)

  // Clone the element to avoid side effects
  const elementClone = rootEl.cloneNode(true) as HTMLElement

  // Remove elements we don't want to include in the snapshot
  const isAllowedElement = (_element: Element): boolean => {
    const isDisallowedElement = _element instanceof HTMLInputElement
      || _element instanceof HTMLTextAreaElement
      || _element instanceof HTMLImageElement
    if (isDisallowedElement) return false
    return Array.from(_element.classList).every((className) => !disallowedElementClasses.has(className))
  }

  Array.from(elementClone.querySelectorAll("*")).forEach(el => {
    if (!isAllowedElement(el)) {
      el.parentElement?.removeChild(el)
    } else if (el instanceof HTMLElement) {
      // Elements won't render if they're animated
      el.style.animationDuration = "auto"
    }
  })

  // The PixiJS canvas inside the `graph-svg` SVG element requires special handling. We extract its
  // content using PixiJS, create an image element using the extracted content, then replace the canvas
  // element with the image element.
  const pixiSvg = elementClone.querySelector("svg.graph-svg")
  const pixiForeignObject = pixiSvg?.querySelector("foreignObject")
  const pixiCanvas = pixiForeignObject?.querySelector("canvas")
  if (pixiForeignObject && pixiCanvas) {
    const image = imageFromPixiCanvas(pixiForeignObject)
    if (image) {
      pixiSvg?.replaceChild(image, pixiForeignObject)
    }
  }

  const backgroundImage = backgroundImageUrl ? document.createElementNS(svgNS, "image") : null
  if (backgroundImage && backgroundImageUrl) {
    backgroundImage.setAttribute("x", "0")
    backgroundImage.setAttribute("y", "0")
    backgroundImage.setAttribute("width", graphWidth.toString())
    backgroundImage.setAttribute("height", graphHeight.toString())
    backgroundImage.setAttributeNS(svgNS, "href", backgroundImageUrl)
    foreignObject.appendChild(backgroundImage)
  }

  // Wrap in a div to ensure proper layout in foreignObject
  const wrapper = document.createElementNS(xhtmlNS, "div")
  wrapper.setAttribute("xmlns", xhtmlNS)
  wrapper.style.width = "100%"
  wrapper.style.height = "100%"
  wrapper.className = "png-container"
  wrapper.appendChild(elementClone)
  foreignObject.appendChild(wrapper)
  svg.appendChild(foreignObject)

  // Serialize SVG
  return new XMLSerializer().serializeToString(svg)
}

interface IGraphSnapshotOptions extends IGraphSvgOptions {
  asDataURL: boolean
}

export const graphSnapshot = (options: IGraphSnapshotOptions): Promise<string | Blob> => {
  const { rootEl, graphWidth, graphHeight, asDataURL, pixiPoints, map } = options

  // Create a canvas to render the snapshot
  const mainCanvas = document.createElement("canvas")
  mainCanvas.width = graphWidth
  mainCanvas.height = graphHeight
  const mainCtx = mainCanvas.getContext("2d")
  if (mainCtx) {
    mainCtx.fillStyle = "#f8f8f8"
    mainCtx.fillRect(0, 0, graphWidth, graphHeight)
  }

  /**
   * Renders an element onto the main canvas by drawing it inside a foreignObject in an SVG,
   * then rasterizing the SVG to the canvas. This preserves HTML structure and styles.
   * @param element The HTML element to render.
   */
  const renderGraphToCanvas = async (backgroundImageUrl?: string) => {
    // Serialize SVG
    const svgString = graphSvg({ rootEl, graphWidth, graphHeight, pixiPoints, backgroundImageUrl })
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`

    console.log(svgString)

    // Draw SVG to canvas
    await new Promise<void>((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => {
        if (mainCtx) {
          mainCtx.drawImage(img, 0, 0, graphWidth, graphHeight)
        }
        resolve()
      }
      img.onerror = reject
      img.src = svgDataUrl
    })
  }

  const makeCanvasBlob = (canvas: HTMLCanvasElement): Blob => {
    const canvasDataURL = canvas.toDataURL("image/png")
    const canvasData = atob(canvasDataURL.substring("data:image/png;base64,".length))
    const canvasAsArray = new Uint8Array(canvasData.length)

    for (let i = 0; i < canvasData.length; i++) {
      canvasAsArray[i] = canvasData.charCodeAt(i)
    }

    return new Blob([canvasAsArray.buffer], { type: "image/png" })
  }

  const renderImage = async () => {

    let backgroundImageUrl: string | undefined
    const leafletCanvas = await createLeafletImageCanvas(map)
    if (leafletCanvas && mainCtx) {
      backgroundImageUrl = leafletCanvas.toDataURL("image/png")
      // mainCtx.drawImage(leafletCanvas, 0, 0, graphWidth, graphHeight)
    }

    // eslint-disable-next-line no-constant-condition
    if (true) {
      await renderGraphToCanvas(backgroundImageUrl)
    }
    return Promise.resolve(asDataURL ? mainCanvas.toDataURL("image/png") : makeCanvasBlob(mainCanvas))
  }
  return renderImage()
}
