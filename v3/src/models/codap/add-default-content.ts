import { typedId } from "../../utilities/js-utils"
import { appState } from "../app-state"
import { getTileContentInfo } from "../tiles/tile-content-info"
import { getTileEnvironment } from "../tiles/tile-environment"
import { TileModel } from "../tiles/tile-model"

export function createDefaultTileOfType(tileType: string) {
  const env = getTileEnvironment(appState.document)
  const info = getTileContentInfo(tileType)
  const id = typedId(info?.prefix || "TILE")
  const content = info?.defaultContent({ env })
  return content ? TileModel.create({ id, content }) : undefined
}
