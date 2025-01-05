import { graphDataDisplayHandler } from "./graph-data-display-handler"
import { ITileContentModel } from "../../models/tiles/tile-content"
import { kGraphTileType } from "./graph-defs"

describe("graphDataDisplayHandler", () => {
  it("should return an exportDataUri for a graph", async () => {
    const graphContent = {
      renderState: {
        updateSnapshot: jest.fn(),
        dataUri: "data:image/png;base64,"
      },
      type: kGraphTileType
    } as Partial<ITileContentModel>
    const result = await graphDataDisplayHandler.get(graphContent as ITileContentModel)
    expect(result).toEqual({ exportDataUri: "data:image/png;base64,", success: true })
  })

  it("should return success as false for other types", async () => {
    const content = { type: "table" } as ITileContentModel
    const result = await graphDataDisplayHandler.get(content)
    expect(result).toEqual({ success: false })
  })
})
