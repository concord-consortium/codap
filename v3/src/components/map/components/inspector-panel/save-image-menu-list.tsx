import { toPng, toSvg } from 'html-to-image'
import { MenuItem } from "react-aria-components"

import { useCfmContext } from "../../../../hooks/use-cfm-context"
import { useProgress } from "../../../../hooks/use-progress"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { t } from "../../../../utilities/translation/translate"
import { openInDrawTool } from "../../../data-display/data-display-image-utils"
import { PointRendererArray } from "../../../data-display/renderer"
import { InspectorMenuContent } from "../../../inspector-panel"
import { isMapContentModel } from "../../models/map-content-model"

type ExportableFormat = "png" | "svg"

interface IProps {
  tile?: ITileModel
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to load map image"))
    img.src = src
  })
}

// html-to-image cannot capture WebGL canvases, so PIXI-rendered points are missing from
// its output. Composite each visible WebGL point layer's static snapshot on top of the
// html-to-image base (basemap, polygons, connecting-lines SVG, heatmap).
async function compositeMapPng(
  displayElement: HTMLElement, rendererArray: PointRendererArray
): Promise<string> {
  const baseDataUri = await toPng(displayElement)
  const baseImage = await loadImage(baseDataUri)

  const canvas = document.createElement("canvas")
  canvas.width = baseImage.naturalWidth
  canvas.height = baseImage.naturalHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Failed to get 2D canvas context for PNG export")

  ctx.drawImage(baseImage, 0, 0)

  const displayRect = displayElement.getBoundingClientRect()
  if (displayRect.width > 0 && displayRect.height > 0) {
    // html-to-image scales by pixelRatio, so compute scale from the base image dimensions
    const scaleX = canvas.width / displayRect.width
    const scaleY = canvas.height / displayRect.height
    for (const renderer of rendererArray) {
      // Canvas-2D renderers are already captured by html-to-image, so only composite WebGL layers
      if (!renderer?.canvas || !renderer.isVisible || renderer.capability !== "webgl") continue
      const sourceCanvas = renderer.snapshotCanvas()
      if (!sourceCanvas || sourceCanvas.width === 0 || sourceCanvas.height === 0) continue
      const canvasRect = renderer.canvas.getBoundingClientRect()
      if (canvasRect.width <= 0 || canvasRect.height <= 0) continue
      ctx.drawImage(
        sourceCanvas,
        0, 0, sourceCanvas.width, sourceCanvas.height,
        (canvasRect.left - displayRect.left) * scaleX,
        (canvasRect.top - displayRect.top) * scaleY,
        canvasRect.width * scaleX,
        canvasRect.height * scaleY
      )
    }
  }

  return canvas.toDataURL("image/png")
}

export const SaveImageMenuList = ({tile}: IProps) => {
  const cfm = useCfmContext()
  const { setProgressMessage, clearProgressMessage } = useProgress()
  const mapModel = isMapContentModel(tile?.content) ? tile?.content : undefined

  const getImageDataUri = async (format: ExportableFormat) => {
    if (!mapModel?.renderState) {
      return undefined
    }
    const {displayElement, rendererArray} = mapModel.renderState
    let dataUri: string|undefined = undefined

    // TODO: add translation for progress message
    setProgressMessage("Exporting map ...")
    try {
      dataUri = format === "png"
        ? await compositeMapPng(displayElement, rendererArray)
        : await toSvg(displayElement)
    } catch (error) {
      console.error(`Error generating ${format.toUpperCase()} image:`, error)
    }
    clearProgressMessage()

    return dataUri
  }

  const getImageDataString = async (format: ExportableFormat) => {
    const dataUri = await getImageDataUri(format)
    const parts = dataUri?.split(",")
    if (parts?.length === 2) {
      if (parts[0].indexOf("charset=utf-8") >= 0) {
        return decodeURIComponent(parts[1])
      }
      return parts[1]
    }
    return undefined
  }

  // The menu item that invokes this handler is currently disabled (CODAP-1303): launching the
  // Draw tool from the Map has significant bugs. Once those are resolved, remove `isDisabled`
  // from the corresponding <MenuItem> below to re-enable.
  const handleOpenInDrawTool = async () => {
    if (tile) {
      const imageDataUri = await getImageDataUri("png")
      await openInDrawTool(tile, imageDataUri || "")
    }
  }

  const handleExportPNG = async () => {
    const imageString = await getImageDataString("png")
    if (imageString) {
      cfm?.client.saveSecondaryFileAsDialog(imageString, "png", "image/png", () => null)
    } else {
      // TODO: determine final message and translate it
      const message = "Unable to export PNG image."
      cfm?.client.alert(message, t("DG.DataDisplayMenu.exportPngImage"), () => {
        cfm?.client.hideAlert()
      })
    }
  }

  /*

  DISABLED FOR NOW: SVG export is not yet working well enough to expose to users.

  const handleExportSVG = async () => {
    const imageString = await getImageDataString("svg")
    if (imageString) {
      // NOTE: Using application/octet-stream so that the CFM does not try to convert from base64
      // as it does by default for image-based mime types.
      cfm?.client.saveSecondaryFileAsDialog(imageString, "svg", "application/octet-stream", () => null)
    } else {
      // TODO: determine final message and translate it
      const message = "Unable to export SVG image."
      cfm?.client.alert(message, t("DG.DataDisplayMenu.exportSvgImage"), () => {
        cfm?.client.hideAlert()
      })
    }
  }
  */

  return (
    <InspectorMenuContent data-testid="save-image-menu-list">
      <MenuItem data-testid="open-in-draw-tool" onAction={handleOpenInDrawTool} isDisabled={true}>
        {t("DG.DataDisplayMenu.copyAsImage")}<span aria-hidden="true"> 🚧</span>
      </MenuItem>
      <MenuItem data-testid="export-png-image" onAction={handleExportPNG}>
        {t("DG.DataDisplayMenu.exportPngImage")}
      </MenuItem>
      {/*
      <MenuItem data-testid="export-svg-image" onAction={handleExportSVG}>
        {t("DG.DataDisplayMenu.exportSvgImage")}
      </MenuItem>
      */}
    </InspectorMenuContent>
  )
}
