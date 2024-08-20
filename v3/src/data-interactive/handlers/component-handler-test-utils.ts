import { appState } from "../../models/app-state"
import { IFreeTileRow } from "../../models/document/free-tile-row"
import { ITileModel } from "../../models/tiles/tile-model"
import { toV2Id } from "../../utilities/codap-utils"
import { kComponentTypeV3ToV2Map, V2Component } from "../data-interactive-component-types"
import { DIHandler } from "../data-interactive-types"

type specificTileGetTest = (tile: ITileModel, values: V2Component) => void
interface IOptions {
  type?: string
}
export function testGetComponent(
  tile: ITileModel, handler: DIHandler, extraTest?: specificTileGetTest, options?: IOptions
) {
  const getResult = handler.get!({ component: tile })
  expect(getResult.success).toBe(true)
  const values = getResult.values as V2Component
  const { cannotClose, dimensions, id, name, position, title, type } = values
  expect(cannotClose).toBe(tile.cannotClose)
  expect(id).toBe(toV2Id(tile.id))
  expect(name).toBe(tile.name || undefined)
  expect(title).toBe(tile._title)
  expect(type).toBe(options?.type ?? kComponentTypeV3ToV2Map[tile.content.type])
  const row = appState.document.content!.findRowContainingTile(tile.id) as IFreeTileRow
  const { height, width } = row.getTileDimensions(tile.id)!
  expect(dimensions?.height).toBe(height)
  expect(dimensions?.width).toBe(width)
  const { left, top } = row.getTilePosition(tile.id)
  expect((position as any).left).toBe(left)
  expect((position as any).top).toBe(top)

  extraTest?.(tile, values)
}

type specificTileUpdateTest = (tile: ITileModel, values: Partial<V2Component>) => void

export function testUpdateComponent(
  tile: ITileModel, handler: DIHandler, values: Partial<V2Component>, extraTest?: specificTileUpdateTest
) {
  const updateResult = handler.update!({ component: tile }, values)
  expect(updateResult.success).toBe(true)

  // TODO: fill out generic tile update code

  extraTest?.(tile, values)
}
