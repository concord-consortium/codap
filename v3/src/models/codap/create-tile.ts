
import { v3Id } from "../../utilities/codap-utils"
import { ITileContentSnapshotWithType } from "../tiles/tile-content"
import { getTileContentInfo } from "../tiles/tile-content-info"
import { ITileEnvironment } from "../tiles/tile-environment"
import { TileModel } from "../tiles/tile-model"

export interface INewTileOptions {
  cannotClose?: boolean
  content?: ITileContentSnapshotWithType
  title?: string
  setSingletonHidden?: boolean // If undefined, singleton visibility will be toggled
  x?: number
  y?: number
  height?: number
  transitionComplete?: boolean
  width?: number
}

export function createTileSnapshotOfType(tileType: string, env?: ITileEnvironment, options?: INewTileOptions) {
  const info = getTileContentInfo(tileType)
  const id = v3Id(info?.prefix || "TILE")
  const content = options?.content ?? info?.defaultContent({ env })
  const cannotClose = options?.cannotClose
  const title = options?.title
  const transitionComplete = options?.transitionComplete
  return content ? { cannotClose, content, id, title, transitionComplete } : undefined
}

export function createTileOfType(tileType: string, env?: ITileEnvironment, options?: INewTileOptions) {
  const snapshot = createTileSnapshotOfType(tileType, env, options)
  return snapshot ? TileModel.create(snapshot) : undefined
}
