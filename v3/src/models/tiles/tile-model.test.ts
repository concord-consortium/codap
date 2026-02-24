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

  it("handles isResizable with boolean values", () => {
    const tile = TileModel.create({ content: getTileContentInfo("Graph")!.defaultContent() })

    // default: undefined _isResizable, isResizable reflects isUserResizable
    expect(tile._isResizable).toBeUndefined()
    expect(tile.isResizable).toEqual({ width: true, height: true })

    // set to false boolean
    tile.setIsResizable(false)
    expect(tile._isResizable).toEqual({ width: false, height: false })
    expect(tile.isResizable).toEqual({ width: false, height: false })

    // set to true boolean
    tile.setIsResizable(true)
    expect(tile._isResizable).toEqual({ width: true, height: true })
    expect(tile.isResizable).toEqual({ width: true, height: true })

    // set to undefined clears the override
    tile.setIsResizable(undefined)
    expect(tile._isResizable).toBeUndefined()
    expect(tile.isResizable).toEqual({ width: true, height: true })
  })

  it("handles isResizable with object values", () => {
    const tile = TileModel.create({ content: getTileContentInfo("Graph")!.defaultContent() })

    // set width-only resizable
    tile.setIsResizable({ width: true, height: false })
    expect(tile._isResizable).toEqual({ width: true, height: false })
    expect(tile.isResizable).toEqual({ width: true, height: false })

    // set height-only resizable
    tile.setIsResizable({ width: false, height: true })
    expect(tile._isResizable).toEqual({ width: false, height: true })
    expect(tile.isResizable).toEqual({ width: false, height: true })

    // set both false
    tile.setIsResizable({ width: false, height: false })
    expect(tile._isResizable).toEqual({ width: false, height: false })
    expect(tile.isResizable).toEqual({ width: false, height: false })
  })

  it("isResizable respects isUserResizable constraint", () => {
    // Calculator has isUserResizable === false, so isResizable should always be false
    // regardless of what _isResizable is set to
    const tile = TileModel.create({ content: getTileContentInfo("Calculator")!.defaultContent() })

    // default: isResizable should be false even though _isResizable is undefined
    expect(tile._isResizable).toBeUndefined()
    expect(tile.isUserResizable).toBe(false)
    expect(tile.isResizable).toEqual({ width: false, height: false })

    // setting _isResizable to true should not override isUserResizable
    tile.setIsResizable(true)
    expect(tile._isResizable).toEqual({ width: true, height: true })
    expect(tile.isResizable).toEqual({ width: false, height: false })

    // partial object form should also be constrained
    tile.setIsResizable({ width: true, height: false })
    expect(tile._isResizable).toEqual({ width: true, height: false })
    expect(tile.isResizable).toEqual({ width: false, height: false })
  })

  it("normalizes boolean _isResizable in preProcessSnapshot", () => {
    // simulate a snapshot saved with boolean _isResizable
    const snapshot: any = {
      content: getTileContentInfo("Graph")!.defaultContent(),
      _isResizable: false
    }
    const tile = TileModel.create(snapshot)
    expect(tile._isResizable).toEqual({ width: false, height: false })
    expect(tile.isResizable).toEqual({ width: false, height: false })

    const snapshot2: any = {
      content: getTileContentInfo("Graph")!.defaultContent(),
      _isResizable: true
    }
    const tile2 = TileModel.create(snapshot2)
    expect(tile2._isResizable).toEqual({ width: true, height: true })
    expect(tile2.isResizable).toEqual({ width: true, height: true })
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
