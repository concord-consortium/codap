
import { ITileContentModel } from "../../../models/tiles/tile-content"
import { getTileModel } from "../../../models/tiles/tile-model"
import { updateTileNotification } from "../../../models/tiles/tile-notifications"

export function updateAxisNotification(updateType: string, domain: readonly number[], tileContent: ITileContentModel) {
  const tileModel = getTileModel(tileContent)
  if (!tileModel) return

  const values = {
    newBounds: {
      lower: domain[0],
      upper: domain[1]
    }
  }

  return updateTileNotification(updateType, tileModel, values)
}
