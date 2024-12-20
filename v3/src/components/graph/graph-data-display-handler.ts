import { DIDataDisplayHandler } from "../../data-interactive/handlers/data-display-handler"
import { ITileContentModel } from "../../models/tiles/tile-content"
import { isGraphContentModel } from "./models/graph-content-model"

export const graphDataDisplayHandler: DIDataDisplayHandler = {
  async get(content: ITileContentModel) {

    if (isGraphContentModel(content)) {
      await content?.renderState?.updateSnapshot()
      
      const exportDataUri = content?.renderState?.dataUri
      return { exportDataUri, success: !!exportDataUri }
    } else {
      return { success: false }
    }
  }
}
