import { DIDataDisplayHandler } from "../../data-interactive/handlers/data-display-handler"
import { ITileContentModel } from "../../models/tiles/tile-content"
import { isGraphContentModel } from "./models/graph-content-model"

export const graphDataDisplayHandler: DIDataDisplayHandler = {
  get(content: ITileContentModel) {
    const exportDataUri = isGraphContentModel(content)
      ? content?.renderState?.dataUri
      : undefined
    return { exportDataUri, success: !!exportDataUri }
  }
}
