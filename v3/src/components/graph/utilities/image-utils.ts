import { Point } from "../../data-display/data-display-types"
import { PixiPoints } from "../../data-display/pixi/pixi-points"

type Dimensions = {
  width: number
  height: number
}
type Job = {
  coords: Point
  dimensions: Dimensions
  element: Element
}

interface IGraphSnapshotOptions {
  rootEl: HTMLElement
  graphWidth: number
  graphHeight: number
  graphTitle: string
  asDataURL: boolean
  pixiPoints: PixiPoints
}

export const graphSnapshot = (options: IGraphSnapshotOptions): Promise<string | Blob> => {
  const { rootEl, graphWidth, graphHeight, graphTitle, asDataURL, pixiPoints } = options

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
   * @param foreignObject {SVGForeignObjectElement} The foreignObject element containing the PixiJS canvas.
   * @returns {SVGImageElement | undefined} An SVG image element representing the PixiJS canvas, or undefined.
   */
  const imageFromPixiCanvas = (foreignObject: SVGForeignObjectElement): SVGImageElement | undefined => {
    const extractedCanvas = pixiPoints.renderer?.extract.canvas(pixiPoints.stage)
    if (!extractedCanvas?.toDataURL) return

    const width = foreignObject.getAttribute("width") ?? extractedCanvas.width.toString()
    const height = foreignObject.getAttribute("height") ?? extractedCanvas.height.toString()
    const x = foreignObject.getAttribute("x") || "0"
    const y = foreignObject.getAttribute("y") || "0"
    const dataURL = extractedCanvas.toDataURL("image/png")
    const image = document.createElementNS("http://www.w3.org/2000/svg", "image")
    image.setAttributeNS(null, "href", dataURL)
    image.setAttributeNS(null, "x", x)
    image.setAttributeNS(null, "y", y)
    image.setAttributeNS(null, "width", width)
    image.setAttributeNS(null, "height", height)

    return image
  }

  const makeDataURLFromSVGElement = (svgEl: SVGSVGElement, dimensions: Dimensions): string => {
    const svgClone = svgEl.cloneNode(true) as SVGSVGElement
    svgClone.style.fill = "#f8f8f8"
    svgClone.setAttribute("width", dimensions.width.toString())
    svgClone.setAttribute("height", dimensions.height.toString())

    // grid lines are too dark without this tweak
    const lines = svgClone.querySelectorAll("line")
    lines.forEach(line => {
      const stroke = line.getAttribute("stroke")
      if (stroke === "rgb(211, 211, 211)") {
        line.setAttribute("stroke", "rgb(230, 230, 230)")
      }
    })

    svgClone.insertBefore(css, svgClone.firstChild)

    // The PixiJS canvas inside the `graph-svg` SVG element requires special handling. We extract its
    // content using PixiJS, create an image element using the extracted content, then replace the canvas
    // element with the image element.
    const foreignObject = svgClone.querySelector("foreignObject")
    const pixiCanvas = foreignObject?.querySelector("canvas")
    if (foreignObject && pixiCanvas) {
      const image = imageFromPixiCanvas(foreignObject)
      if (image) {
        svgClone.replaceChild(image, foreignObject)
      }
    }

    // Serialize the SVG to a data URL
    let svgData = new XMLSerializer().serializeToString(svgClone)
    svgData = svgData.replace(/url\('[^#]*#/g, "url('#")
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`
  }

  const makeCanvas = (bgColor: string, x: number, y: number, width: number, height: number): HTMLCanvasElement => {
    const newCanvas = document.createElement("canvas")
    newCanvas.width = width
    newCanvas.height = height
    const ctx = newCanvas.getContext("2d")

    if (ctx) {
      ctx.fillStyle = bgColor
      ctx.fillRect(x, y, width, height)
    }

    return newCanvas
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

  const makeSVGImage = (dataURL: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image()
        img.onload = () => resolve(img)
        img.src = dataURL
      } catch (ex) {
        reject(ex)
      }
    })
  }

  const addTitle = (canvas: HTMLCanvasElement, bgColor: string, fgColor: string, title: string) => {
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, graphWidth, 25)
      ctx.fillStyle = fgColor
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.stroke()
      ctx.font = "10pt MuseoSans-500"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(title, graphWidth / 2, 14, graphWidth)
    }
  }

  const perform = async (jobIndex: number): Promise<string | Blob> => {
    const job = jobList[jobIndex]
    if (!job) {
      if (graphTitle) {
        addTitle(mainCanvas, "transparent", "white", graphTitle)
      }
      return Promise.resolve(asDataURL ? mainCanvas.toDataURL("image/png") : makeCanvasBlob(mainCanvas))
    }

    const { coords, dimensions, element } = job
    const { x, y } = coords
    const { width, height } = dimensions
    const elType = element.nodeName.toLowerCase()
  
    if (mainCtx) {
      switch (elType) {
        case "div": {
          mainCtx.fillStyle = getComputedStyle(element).backgroundColor || "#f8f8f8"
          mainCtx.fillRect(x, y, width, height)
          break
        }
        case "svg": {
          const svgEl = element as SVGSVGElement
          const dataURL = makeDataURLFromSVGElement(svgEl, dimensions)
          const svgImg = await makeSVGImage(dataURL)
          mainCtx.drawImage(svgImg, x, y, width, height)
          break
        }
        case "p": {
          const elementStyle = getComputedStyle(element)
          mainCtx.fillStyle = elementStyle.backgroundColor || "#f8f8f8"
          mainCtx.fillRect(x, y, width, height)

          // FIXME: Text styling isn't working
          mainCtx.fillStyle = elementStyle.color || "#242424"
          console.log(` -- style`, elementStyle)
          mainCtx.font = `${elementStyle.fontSize || "12px"} ${elementStyle.fontFamily || "Montserrat, sans-serif"}`
          const lineHeight = parseFloat(elementStyle.lineHeight || "12")
          // ctx.textAlign = elementStyle.textAlign as CanvasTextAlign || "right"
          mainCtx.fillText(element.textContent || "", coords.x, coords.y + lineHeight, width)
          break
        }
      }
    }
    
    return perform(jobIndex + 1)
  }

  const getClassNames = (element: Element): string[] => {
    if (element instanceof HTMLElement || element instanceof SVGElement) {
      return Array.from(element.classList)
    }
    return []
  }

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
    "header-right",
    "legend",
    "multi-legend",
  ])

  const isAllowedElement = (element: Element): boolean => {
    // Do not include the element if the adornment is hidden
    const closestWrapper = element.closest(".adornment-wrapper")
    if (closestWrapper?.classList.contains("hidden")) return false

    const classNames = getClassNames(element)
    return classNames.every((className) => !disallowedElementClasses.has(className))
  }

  const allElements = rootEl.querySelectorAll("div, svg, p")
  const targetElements = Array.from(allElements).filter(isAllowedElement)
  const mainCanvas = makeCanvas("#f8f8f8", 0, 0, graphWidth, graphHeight)
  const mainCtx = mainCanvas.getContext("2d")
  const jobList: Job[] = []

  const rootRect = rootEl.getBoundingClientRect()
  targetElements.forEach((element: Element) => {
    const rect = element.getBoundingClientRect()
    const left = rect.left - rootRect.left
    const top = rect.top - rootRect.top
    const coords = { x: left, y: top }
    const dimensions = { width: rect.width, height: rect.height }

    jobList.push({ element, dimensions, coords })
  })

  return perform(0)
}
