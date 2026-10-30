import fs from "fs"
import path from "path"
import { appState } from "../../models/app-state"
import { processAction } from "../data-interactive-request-processor"

describe("update document", () => {
  let broadcastSpy: jest.SpyInstance

  beforeEach(() => {
    jest.useFakeTimers()
    broadcastSpy = jest.spyOn(appState.document.content!, "broadcastMessage")
  })

  afterEach(() => {
    broadcastSpy.mockRestore()
    jest.useRealTimers()
  })

  // the documentChangeNotice broadcasts, with the tile each was targeted at (undefined = every plugin)
  const documentNotices = () => broadcastSpy.mock.calls
    .filter(([message]) => message.resource === "documentChangeNotice")
    .map(([message, , targetTileId]) => ({ values: message.values, targetTileId }))

  const update = (values: any) => processAction({ action: "update", resource: "document", values })

  it("sends updateDocumentBegun, replies, then sends updateDocumentEnded to every plugin", async () => {
    const file = path.join(__dirname, "../../test/v2", "calculator.codap")
    const v2Document = JSON.parse(fs.readFileSync(file, "utf8"))

    const result = await update(v2Document)
    expect(result.success).toBe(true)
    expect(documentNotices()).toEqual([
      { values: { operation: "updateDocumentBegun" }, targetTileId: undefined }
    ])

    jest.advanceTimersByTime(500)
    expect(documentNotices()).toEqual([
      { values: { operation: "updateDocumentBegun" }, targetTileId: undefined },
      { values: { operation: "updateDocumentEnded", success: true }, targetTileId: undefined }
    ])
  })

  it("sends updateDocumentEnded with success: false, and replies with an error, when the update fails", async () => {
    const result = await update({ name: "malformed", components: [], contexts: "not a list" })
    expect(result.success).toBe(false)
    expect(documentNotices()).toEqual([
      { values: { operation: "updateDocumentBegun" }, targetTileId: undefined },
      { values: { operation: "updateDocumentEnded", success: false }, targetTileId: undefined }
    ])
  })

  it("requires values, and then sends nothing", async () => {
    expect((await update(undefined)).success).toBe(false)
    expect(documentNotices()).toEqual([])
  })
})
