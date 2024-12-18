import { ITileContentModel } from "../../models/tiles/tile-content"
import { isGraphContentModel } from "../../components/graph/models/graph-content-model"

export const componentImageSnapshotHandler: any = {
  get(content: ITileContentModel) {
    const exportDataUri = isGraphContentModel(content)
      ? content?.renderState?.dataUri
      : undefined
    return { exportDataUri, success: !!exportDataUri }
  }
}
