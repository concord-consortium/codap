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

export const base64ToBlob = (base64String: string): Blob => {
  const mimeType = base64String.match(/data:([^;]+);base64,/)?.[1] || "application/octet-stream"
  const base64Content = base64String.startsWith("data:")
    ? base64String.split(",")[1]
    : base64String

  // Decode base64 string into a binary buffer.
  const binary = atob(base64Content)
  const binaryLength = binary.length
  const arrayBuffer = new Uint8Array(binaryLength)
  for (let i = 0; i < binaryLength; i++) {
    arrayBuffer[i] = binary.charCodeAt(i)
  }

  return new Blob([arrayBuffer], { type: mimeType })
}

export const downloadGraphSnapshot = (graphSnapshot: string | Blob, filename = "graph.png") => {
  const blob = typeof graphSnapshot === "string"
    ? base64ToBlob(graphSnapshot)
    : graphSnapshot

  // Create a temporary link element to trigger the download.
  // TODO: Use CFM's save dialog instead?
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const graphSnaphsot = (options: IGraphSnapshotOptions): Promise<string | Blob> => {
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

  // const inlineAllStyles = (svgElement: SVGSVGElement) => {
  //   const nodes = svgElement.querySelectorAll("*")
  //   nodes.forEach(node => {
  //     const computedStyles = window.getComputedStyle(node)
  //     for (let i = 0; i < computedStyles.length; i++) {
  //       const key = computedStyles[i]
  //       ;(node as HTMLElement).style.setProperty(key, computedStyles.getPropertyValue(key))
  //     }
  //   })
  // }

  const makeDataURLFromSVGElement = (svgEl: SVGSVGElement, dimensions: Dimensions): string => {
    const svgClone = svgEl.cloneNode(true) as SVGSVGElement
    svgClone.style.fill = "#f8f8f8"
    // I don't think this is necessary. Using getCSSText() works better.
    //inlineAllStyles(svgClone)

    svgClone.setAttribute("width", dimensions.width.toString())
    svgClone.setAttribute("height", dimensions.height.toString())

    // grid lines are too dark
    const lines = svgClone.querySelectorAll("line")
    lines.forEach(line => {
      const stroke = line.getAttribute("stroke")
      if (stroke === "rgb(211, 211, 211)") {
        line.setAttribute("stroke", "rgb(230, 230, 230)")
      }
    })

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

  const perform = async (job?: Job): Promise<string | Blob> => {
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
    const ctx = mainCanvas.getContext("2d")
  
    if (ctx) {
      switch (elType) {
        case "div": {
          ctx.fillStyle = getComputedStyle(job.element).backgroundColor || "#f8f8f8"
          ctx.fillRect(x, y, width, height)
          break
        }
        case "svg": {
          const svgEl = job.element as SVGSVGElement
          const dataURL = makeDataURLFromSVGElement(svgEl, dimensions)
          const svgImg = await makeSVGImage(dataURL)
          ctx.drawImage(svgImg, x, y, width, height)
          break
        }
        case "img": {
          const img = job.element as HTMLImageElement
          ctx.drawImage(img, x, y, width, height)
          break
        }
      }
    }
  
    return perform(jobList[jobIx++])
  }

  const getClassNames = (element: Element): string[] => {
    if (element instanceof HTMLElement || element instanceof SVGElement) {
      return Array.from(element.classList)
    }
    return []
  }

  const isAllowedElement = (element: Element): boolean => {
    const classNames = getClassNames(element)
    return classNames.every((className) => !disallowedClasses.has(className))
  }

  const disallowedClasses = new Set([
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

  const allElements = rootEl.querySelectorAll("div, svg")
  const targetElements = Array.from(allElements).filter(isAllowedElement)
  const mainCanvas = makeCanvas("#f8f8f8", 0, 0, graphWidth, graphHeight)
  const jobList: Job[] = []
  let jobIx = 0

  targetElements.forEach((element: Element) => {
    const rect = element.getBoundingClientRect()
    const rootRect = rootEl.getBoundingClientRect()
    const left = rect.left - rootRect.left
    const top = rect.top - rootRect.top
    const coords = { x: left, y: top }
    const dimensions = { width: rect.width, height: rect.height }

    jobList.push({ element, dimensions, coords })
  })

  return perform(jobList[jobIx++])
}