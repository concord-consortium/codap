import { PixiPoints } from "../../data-display/pixi/pixi-points"

type Coords = { x: number; y: number }
type Dimensions = { width: number; height: number }
type Job = { element: Element; dimensions: Dimensions; coords: Coords }

/**
 * Creates a Blob from a base64 data URL.
 * @param dataURL The base64 data URL to convert.
 * @returns A Blob representing the base64 data URL.
 */
const makeBlob = (dataURL: string): Blob => {
  // Remove data URL prefix.
  const base64 = dataURL.split(",")[1]

  // Decode base64 string into a binary buffer.
  const binary = atob(base64)
  const binaryLength = binary.length
  const arrayBuffer = new Uint8Array(binaryLength)
  for (let i = 0; i < binaryLength; i++) {
    arrayBuffer[i] = binary.charCodeAt(i)
  }

  return new Blob([arrayBuffer], { type: "image/png" })
}

/**
 * Initiates a download for a base64 image.
 * @param base64Data A base64 image string or Blob.
 * @param filename The name of the file to download.
 */
export const downloadBase64Image = (base64Data: string | Blob, filename = "graph.png") => {
  const blob  = typeof base64Data === "string" ? makeBlob(base64Data) : base64Data

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

export const captureSVGElementsToImage = (
  rootEl: HTMLElement,
  graphWidth: number,
  graphHeight: number,
  graphTitle: string,
  asDataURL: boolean,
  pixiPoints: PixiPoints
): Promise<string | Blob> => {

  /**
   * Extracts all CSS rules from all stylesheets in the document.
   * @returns {string} A string containing all CSS rules.
   */
  const getCSSText = (): string => {
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
    if (!extractedCanvas) return

    const foWidth = foreignObject.getAttribute("width")
    const foHeight = foreignObject.getAttribute("height")
    const foX = foreignObject.getAttribute("x")
    const foY = foreignObject.getAttribute("y")
    const plotCanvas = document.createElement("canvas")
    plotCanvas.width = foWidth ? parseInt(foWidth, 10) : extractedCanvas.width
    plotCanvas.height = foHeight ? parseInt(foHeight, 10) : extractedCanvas.height
    if (extractedCanvas.toDataURL) {
      const dataURL = extractedCanvas.toDataURL("image/png")
      const svgNS = "http://www.w3.org/2000/svg"
      const image = document.createElementNS(svgNS, "image")
      image.setAttributeNS(null, "href", dataURL)
      image.setAttributeNS(null, "x", foX || "0")
      image.setAttributeNS(null, "y", foY || "0")
      image.setAttributeNS(null, "width", plotCanvas.width.toString())
      image.setAttributeNS(null, "height", plotCanvas.height.toString())

      return image
    } else {
      return undefined
    }
  }

  const inlineAllStyles = (svgElement: SVGSVGElement) => {
    const nodes = svgElement.querySelectorAll("*")
    nodes.forEach(node => {
      const computedStyles = window.getComputedStyle(node)
      for (let i = 0; i < computedStyles.length; i++) {
        const key = computedStyles[i]
        ;(node as HTMLElement).style.setProperty(key, computedStyles.getPropertyValue(key))
      }
    })
  }

  /**
   * Converts an SVG element to a data URL.
   * @param {SVGSVGElement} svgEl The SVG element to convert.
   * @returns {string} A data URL representing the SVG element.
   */
  const makeDataURLFromSVGElement = (svgEl: SVGSVGElement): string => {
    const svgClone = svgEl.cloneNode(true) as SVGSVGElement
    svgClone.style.fill = "white"
    inlineAllStyles(svgClone)
  
    // Add inline styles from document's CSS
    const css = document.createElement("style")
    css.textContent = getCSSText()
    // Append some custom rules -- hopefully we can make this unnecessary later.
    css.textContent += `
      line.divider {
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

  /**
   * Creates a new canvas element with a white background.
   * @returns {HTMLCanvasElement} A new canvas element with a white background.
   */
  const makeCanvasEl = (): HTMLCanvasElement => {
    const newCanvas = document.createElement("canvas")
    newCanvas.width = graphWidth
    newCanvas.height = graphHeight
    const ctx = newCanvas.getContext("2d")
    if (ctx) {
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, graphWidth, graphHeight)
    }
    return newCanvas
  }

  /**
   * Adds an image to a canvas element. 
   * @param cvs The canvas element to draw on. 
   * @param image The image to draw
   * @param x The x-coordinate of the image
   * @param y The y-coordinate of the image
   * @param w The width of the image
   * @param h The height of the image
   */
  const addImgToCanvas = (cvs: HTMLCanvasElement, image: HTMLImageElement, coords: Coords, dimensions: Dimensions) => {
    const { x, y } = coords
    const { width, height } = dimensions
    const ctx = cvs.getContext("2d")
    ctx?.drawImage(image, x, y, width, height)
  }

  const drawRectToCanvas = (
    cvs: HTMLCanvasElement,
    color: string,
    coords: Coords,
    dimensions: Dimensions
  ) => {
    const { x, y } = coords
    const { width, height } = dimensions
    const ctx = cvs.getContext("2d")
    if (ctx) {
      ctx.fillStyle = color
      ctx.fillRect(x, y, width, height)
    }
  }

  /**
   * Converts a canvas element to a blob.
   * @param cvs The canvas element to convert.
   * @returns {Blob} A blob representing the canvas element.
   */
  const makeCanvasBlob = (cvs: HTMLCanvasElement): Blob => {
    const canvasDataURL = cvs.toDataURL("image/png")
    const canvasData = atob(canvasDataURL.substring("data:image/png;base64,".length))
    const canvasAsArray = new Uint8Array(canvasData.length)

    for (let i = 0; i < canvasData.length; i++) {
      canvasAsArray[i] = canvasData.charCodeAt(i)
    }

    return new Blob([canvasAsArray.buffer], { type: "image/png" })
  }

  /**
   * Converts an SVG element to a data URL.
   * @param svgEl The SVG element to convert.
   * @returns A data URL representing the SVG element.
   */
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

  /**
   * Appends a title to the canvas.
   * @param cvs The canvas element to draw on.
   * @param bgColor The background color of the title.
   * @param fgColor The foreground color of the title.
   * @param title The title to append.
   */
  const addTitle = (cvs: HTMLCanvasElement, bgColor: string, fgColor: string, title: string) => {
    const ctx = cvs.getContext("2d")
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

  /**
   * Performs a given job.
   * @param job The job to perform.
   * @returns A promise that resolves to a data URL or a blob.
   */
  const perform = async (job?: Job): Promise<string | Blob> => {

    if (!job) {
      if (graphTitle) {
        addTitle(canvas, "transparent", "white", graphTitle)
      }
      return Promise.resolve(asDataURL ? canvas.toDataURL("image/png") : makeCanvasBlob(canvas))
    }

    const { dimensions, coords } = job
    const elType = job.element.nodeName.toLowerCase()

    if (elType === "div") {
      const classNames = job.element.className.split(" ")
      const allowedDivClasses = [
        "", // empty string should be considered valid
        "adornment-spanner",
        "adornment-wrapper",
        "codap-component-border",
        "codap-component-corner",
        "component-title-bar",
        "graph-adornments-grid",
        "graph-adornments-grid__cell",
        "graph-count",
        "graph-plot",
        "innerGrid",
        //"legend",
        "movable-line-equation-container",
        //"multi-legend",
        "title-bar",
        "title-text"
      ]
      // const disallowedClasses = [
      //   "axis-legend-attribute-menu",
      //   "attribute-label-menu",
      //   "chakra-menu__menu-list",
      //   "css-1nesaxo", // or css-* somehow?
      //   "droppable-axis",
      //   "droppable-svg",
      //   "header-right",
      // ]

      if (classNames.some((className) => allowedDivClasses.includes(className))) {
        const bgColor = getComputedStyle(job.element).backgroundColor || "white"
        drawRectToCanvas(canvas, bgColor, coords, dimensions)
      }
    } else if (elType === "svg") {
      const dataURL = makeDataURLFromSVGElement(job.element as SVGSVGElement)
      const img = await makeSVGImage(dataURL)
      addImgToCanvas(canvas, img, coords, dimensions)
    } else if (elType === "img") {
      const img = job.element as HTMLImageElement
      addImgToCanvas(canvas, img, coords, dimensions)
    }
  
    return perform(jobList[jobIx++])
  }

  const disallowedClasses = [
    "axis-legend-attribute-menu",
    "attribute-label-menu",
    "chakra-menu__menu-list",
    "codap-component-corner",
    "css-1nesaxo", // or css-* somehow?
    "droppable-axis",
    "droppable-svg",
    "header-right",
    "legend-component",
    "legend-categories"
  ]
  const elements = rootEl.querySelectorAll("div, svg")
  // remove all elements that are not allowed
  let allowedElements = Array.from(elements).filter((element) => {
    if (element instanceof HTMLElement) {
      const classNames = element.className.split(" ")
      return classNames.every((className) => !disallowedClasses.includes(className))
    }
    return true
  })
  // remove all elements that are children of elements that are not allowed
  allowedElements = allowedElements.filter((element) => {
    let parent = element.parentElement
    while (parent) {
      if (parent instanceof HTMLElement) {
        const classNames = parent.className.split(" ")
        if (classNames.some((className) => disallowedClasses.includes(className))) {
          return false
        }
      }
      parent = parent.parentElement
    }
    return true
  })
  const canvas = makeCanvasEl()
  const jobList: Job[] = []
  let jobIx = 0

  allowedElements.forEach((element: Element) => {
    const rect = element.getBoundingClientRect()
    const rootRect = rootEl.getBoundingClientRect()
    // const hasInlineStyle = element instanceof HTMLElement && element.hasAttribute("style")
    // const hasInlineStyleWidth = hasInlineStyle && element.style.width
    // const hasInlineStyleHeight = hasInlineStyle && element.style.height
    const isSvgElement = element instanceof SVGSVGElement
    const width = isSvgElement ? element.width.baseVal.value : rect.width
    const height = isSvgElement ? element.height.baseVal.value : rect.height
    const left = rect.left - rootRect.left
    const top = rect.top - rootRect.top
    const coords = { x: left, y: top }
    const dimensions = { width, height }

    jobList.push({ element, dimensions, coords })
  })

  return perform(jobList[jobIx++])
}
