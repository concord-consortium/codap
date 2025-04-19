
import { ITileModel } from "../../../models/tiles/tile-model"
import { updateTileNotification } from "../../../models/tiles/tile-notifications"

export function updateAxisNotification(updateType: string, domain: readonly number[], tileModel: ITileModel) {
  if (!tileModel) return

  const values = {
    newBounds: {
      lower: domain[0],
      upper: domain[1]
    }
  }

  return updateTileNotification(updateType, values, tileModel)
}
