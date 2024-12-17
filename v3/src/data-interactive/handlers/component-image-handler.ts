import { ITileContentModel } from "../../models/tiles/tile-content"
import { isGraphContentModel } from "../../components/graph/models/graph-content-model"

export const componentImageHandler: any = {
  create() {
    return { success: false }
  },
  get(content: ITileContentModel) {
    console.log("componentImageHandler content", content)
    const exportDataUri = isGraphContentModel(content) ? content?.exportDataUri : undefined
    return { exportDataUri, success: !!exportDataUri }
  },
  update() {
    return { success: false }
  },
  notify() {
    return { success: false }
  }
}
