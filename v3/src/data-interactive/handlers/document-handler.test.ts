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

  // the documentChangeNotice and global[<name>] broadcasts, in order
  const notices = () => broadcastSpy.mock.calls
    .map(([message]) => message)
    .filter(({ resource }) => resource === "documentChangeNotice" || resource.startsWith("global["))
    .map(({ resource, values }) => ({ resource, values }))

  // update sends updateDocumentEnded 500 ms after the document is replaced
  async function update(values: any) {
    processAction({ action: "update", resource: "document", values })
    await jest.advanceTimersByTimeAsync(1000)
  }

  const sliderDocument = (value: number) => {
    const file = path.join(__dirname, "../../test/v2", "slider.codap")
    const v2Document = JSON.parse(fs.readFileSync(file, "utf8"))
    v2Document.globalValues[0].value = value
    return v2Document
  }

  it("sends global[<name>] when it changes an existing global's value, as in V2", async () => {
    await update(sliderDocument(3))
    broadcastSpy.mockClear()

    await update(sliderDocument(5))
    expect(notices()).toEqual([
      { resource: "documentChangeNotice", values: { operation: "updateDocumentBegun" } },
      { resource: "global[mine]", values: { globalValue: 5 } },
      { resource: "documentChangeNotice", values: { operation: "updateDocumentEnded" } }
    ])

    // an update that leaves the value unchanged sends no global[<name>]
    broadcastSpy.mockClear()
    await update(sliderDocument(5))
    expect(notices()).toEqual([
      { resource: "documentChangeNotice", values: { operation: "updateDocumentBegun" } },
      { resource: "documentChangeNotice", values: { operation: "updateDocumentEnded" } }
    ])
  })
})
