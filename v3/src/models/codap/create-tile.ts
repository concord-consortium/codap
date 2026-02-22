
import { v3Id } from "../../utilities/codap-utils"
import { ITileContentSnapshotWithType } from "../tiles/tile-content"
import { getTileContentInfo, IDocumentContentLike } from "../tiles/tile-content-info"
import { ITileEnvironment } from "../tiles/tile-environment"
import { TileModel } from "../tiles/tile-model"

export interface INewTileOptions {
  animateCreation?: boolean
  cannotClose?: boolean
  content?: ITileContentSnapshotWithType
  name?: string
  title?: string
  markNewlyCreated?: boolean
  setSingletonHidden?: boolean // If undefined, singleton visibility will be toggled
  position?: string | { left: number, top: number }
  x?: number
  y?: number
  height?: number
  width?: number
}

export function createTileSnapshotOfType(
  tileType: string, env?: ITileEnvironment,
  documentContent?: IDocumentContentLike, options?: INewTileOptions
) {
  const info = getTileContentInfo(tileType)
  const id = v3Id(info?.prefix || "TILE")
  const name = options?.name ?? info?.defaultName?.({ env })
  const content = options?.content ?? info?.defaultContent({ env, documentContent })
  const cannotClose = options?.cannotClose
  const title = options?.title
  return content ? { cannotClose, content, id, name, title } : undefined
}

export function createTileOfType(
  tileType: string, env?: ITileEnvironment,
  documentContent?: IDocumentContentLike, options?: INewTileOptions
) {
  const snapshot = createTileSnapshotOfType(tileType, env, documentContent, options)
  const tile = snapshot ? TileModel.create(snapshot) : undefined
  if (tile && options?.markNewlyCreated) {
    tile.setNewlyCreated(true)
  }
  return tile
}
