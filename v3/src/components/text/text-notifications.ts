import { updateTileNotification } from "../../models/tiles/tile-notifications"
import { ITileModel } from "../../models/tiles/tile-model"
import { ITextModel } from "./text-model"

export function commitEditNotification(textModel: ITextModel, tile?: ITileModel) {
  return updateTileNotification("commitEdit", {
    title: tile?.title,
    text: JSON.stringify(textModel.value)
  }, tile)
}
