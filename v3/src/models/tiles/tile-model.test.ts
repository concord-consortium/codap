import { getSnapshot } from "mobx-state-tree"
import { TileModel } from "./tile-model"
import { getTileTypes, getTileContentInfo } from "./tile-content-info"
import { kDefaultMinWidth } from "./tile-layout"
import { IUnknownContentModel } from "./unknown-content"
import { kUnknownTileType } from "./unknown-types"

// Define the built in tool ids explicitly as strings.
// Strings are used because importing the tool id constant could trigger a
// registration of the tool. The tools will all be registered due to the
// registerTools below.
// The tools are listed instead of just using getToolIds (see below) in order to
// make sure all of these built in tools get registered correctly as expected.
const builtInTileTypes = [
  "Unknown",
  "Placeholder"
]

// This is needed so we can check which tools are registered below
import { registerTileTypes } from "../../register-tile-types"
registerTileTypes(builtInTileTypes)

describe("TileModel", () => {

  // Add any dynamically registered tools to the list
  // currently there are no dynamically registered tools, but in the future hopefully
  // there will be at least one example of this
  const registeredTileTypeIds = getTileTypes()

  // Remove the duplicates.
  const uniqueTileTypes = new Set([...registeredTileTypeIds, ...builtInTileTypes])

  uniqueTileTypes.forEach(tileType => {
    // It would be useful to extend this with additional tests verifying that tiles
    // and their content info follow the right patterns
    it(`supports the tile type: ${tileType}`, () => {
      const toolDefaultContent = getTileContentInfo(tileType)?.defaultContent

      assertIsDefined(toolDefaultContent)

      // can create a model with each type of tool
      const content: any = { type: tileType }

      // UnknownToolModel has required property
      if (tileType === kUnknownTileType) {
        content.originalType = "foo"
      }

      let tile = TileModel.create({ content: toolDefaultContent?.() })
      expect(tile.content.type).toBe(tileType)

      // can create/recognize snapshots of each type of tool
      const snapshot: any = getSnapshot(tile)
      expect(snapshot.content.type).toBe(tileType)

      // can create tool tiles with correct tool from snapshot
      tile = TileModel.create(snapshot)
      expect(tile.content.type).toBe(tileType)
    })
  })

  it("returns UnknownToolModel for unrecognized snapshots", () => {
    const type = "foo"
    const content: any = { type, bar: "baz" }
    const contentStr = JSON.stringify(content)
    let tile = TileModel.create({ content })
    expect(tile.content.type).toBe(kUnknownTileType)
    const toolContent: IUnknownContentModel = tile.content as any
    expect(toolContent.original).toBe(contentStr)

    tile = TileModel.create(getSnapshot(tile))
    expect(tile.content.type).toBe(kUnknownTileType)
  })

  it("returns appropriate defaults for minWidth and maxWidth", () => {
    const tile = TileModel.create({
                        content: {
                          type: "foo" as any,
                          bar: "baz"
                        } as any
                      })
    expect(tile.minWidth).toBe(kDefaultMinWidth)
    expect(tile.maxWidth).toBeUndefined()
  })

})
