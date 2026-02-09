import { getTitle } from "../../models/tiles/tile-content-info"
import { getPositionOfNewComponent } from "../../utilities/view-utils"
import { ITileModel } from "../../models/tiles/tile-model"
import { IWebViewSnapshot } from "../web-view/web-view-model"
import { kWebViewTileType } from "../web-view/web-view-defs"
import { getDrawToolPluginUrl } from "../../constants"
import { appState } from "../../models/app-state"
import { isFreeTileRow } from "../../models/document/free-tile-row"

interface IImageDimensions {
  width: number
  height: number
}

export const openInDrawTool = async (tile: ITileModel, imageString: string, imageDimensions?: IImageDimensions) => {
  const title = (tile && getTitle?.(tile)) || tile?.title || ""
  // Use image dimensions for positioning if available, otherwise use defaults
  const dimensions = imageDimensions ?? { width: 400, height: 300 }
  const computedPosition = getPositionOfNewComponent(dimensions)
  const webViewModelSnap: IWebViewSnapshot = {
    type: kWebViewTileType,
    subType: "plugin",
    url: getDrawToolPluginUrl(),
  }
  const drawTileModel = appState.document.content?.insertTileSnapshotInDefaultRow({
    _title: `Draw: ${title}`,
    content: webViewModelSnap
  })
  const drawContentModel = drawTileModel?.content
  if (drawContentModel && imageString) {
    // Give the draw tool a moment to initialize before passing the image to it
    setTimeout(() => {
      drawContentModel.broadcastMessage({
        action: "update",
        resource: 'backgroundImage',
        values: { image: imageString }
      }, () => null)
      const row = appState.document.content?.findRowContainingTile(drawTileModel?.id)
      const freeTileRow = row && isFreeTileRow(row) ? row : undefined
      freeTileRow?.setTilePosition(drawTileModel?.id, computedPosition)
    }, 500)
  }
}
