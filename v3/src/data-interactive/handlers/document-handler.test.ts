import fs from "fs"
import path from "path"
import "../../components/slider/slider-registration"
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

  const sliderDocument = (value: number) => {
    const file = path.join(__dirname, "../../test/v2", "slider.codap")
    const v2Document = JSON.parse(fs.readFileSync(file, "utf8"))
    v2Document.globalValues[0].value = value
    return v2Document
  }

  // the documentChangeNotice and global[<name>] broadcasts, in order, for an update and its updateDocumentEnded
  async function updateNotices(values: any) {
    broadcastSpy.mockClear()
    expect((await update(values)).success).toBe(true)
    jest.advanceTimersByTime(500)
    return broadcastSpy.mock.calls
      .map(([message]) => message)
      .filter(({ resource }) => resource === "documentChangeNotice" || resource.startsWith("global["))
      .map(({ resource, values: _values }) => ({ resource, values: _values }))
  }

  it("sends global[<name>] when it changes an existing global's value, as in V2", async () => {
    await updateNotices(sliderDocument(3))

    expect(await updateNotices(sliderDocument(5))).toEqual([
      { resource: "documentChangeNotice", values: { operation: "updateDocumentBegun" } },
      { resource: "global[mine]", values: { globalValue: 5 } },
      { resource: "documentChangeNotice", values: { operation: "updateDocumentEnded", success: true } }
    ])

    // an update that leaves the value unchanged sends no global[<name>]
    expect(await updateNotices(sliderDocument(5))).toEqual([
      { resource: "documentChangeNotice", values: { operation: "updateDocumentBegun" } },
      { resource: "documentChangeNotice", values: { operation: "updateDocumentEnded", success: true } }
    ])
  })
})
