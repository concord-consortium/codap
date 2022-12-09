import { getSnapshot } from "mobx-state-tree"
import { UnknownContentModel } from "./unknown-content"
import { kUnknownTileType } from "./unknown-types"

describe("UnknownContentModel", () => {

  it("can be created from snapshots", () => {
    // can be created from other tool snapshots
    const toolType = "Text"
    const toolContent = { type: toolType, text: "Some text" }
    let content = UnknownContentModel.create(toolContent as any)
    expect(content.type).toBe(kUnknownTileType)
    expect(content.original).toBe(JSON.stringify(toolContent))

    // can be created from UnknownToolModel snapshots
    content = UnknownContentModel.create(getSnapshot(content))
    expect(content.type).toBe(kUnknownTileType)
    expect(content.original).toBe(JSON.stringify(toolContent))
  })

  it("stringifies original tool contents when appropriate", () => {
    // can be created from other tool snapshots
    const toolType = "Geometry"
    const toolContent = { type: toolType, geometry: "Some Geometry" }
    let content = UnknownContentModel.create(toolContent as any)
    expect(content.type).toBe(kUnknownTileType)
    expect(content.original).toBe(JSON.stringify(toolContent))

    // can be created from UnknownToolModel snapshots
    content = UnknownContentModel.create(getSnapshot(content))
    expect(content.type).toBe(kUnknownTileType)
    expect(content.original).toBe(JSON.stringify(toolContent))
  })

})
