import { getSnapshot } from "mobx-state-tree"
import { RequestQueue } from "../components/web-view/request-queue"
import { appState } from "../models/app-state"
import { SharedDataSet } from "../models/shared/shared-data-set"
import { ITileModel } from "../models/tiles/tile-model"
import { setupTestDataset } from "../test/dataset-test-utils"
import { processAction, setupRequestQueueProcessor } from "./data-interactive-request-processor"
import { getNotificationRequesterTileId, withNotificationRequester } from "./notification-requester"
import { notification } from "./notification-utils"

describe("data context change notices and the requesting plugin", () => {
  const { content } = appState.document
  content?.createDataSet(getSnapshot(setupTestDataset().dataset))
  const dataset = content!.getFirstSharedModelByType(SharedDataSet)!.dataSet
  const datasetName = dataset.name
  const pluginTile = { id: "PLUGIN_TILE" } as ITileModel

  let broadcastSpy: jest.SpyInstance

  beforeEach(() => {
    broadcastSpy = jest.spyOn(content!, "broadcastMessage")
  })

  afterEach(() => {
    broadcastSpy.mockRestore()
  })

  function dataContextNoticeCalls() {
    return broadcastSpy.mock.calls.filter(([message]) => message.resource.startsWith("dataContextChangeNotice"))
  }

  it("tracks the requester only while the function runs", () => {
    expect(getNotificationRequesterTileId()).toBeUndefined()
    const result = withNotificationRequester("outer", () => {
      expect(getNotificationRequesterTileId()).toBe("outer")
      withNotificationRequester("inner", () => {
        expect(getNotificationRequesterTileId()).toBe("inner")
      })
      expect(getNotificationRequesterTileId()).toBe("outer")
      return 7
    })
    expect(result).toBe(7)
    expect(getNotificationRequesterTileId()).toBeUndefined()
    expect(() => withNotificationRequester("thrown", () => { throw new Error("oops") })).toThrow()
    expect(getNotificationRequesterTileId()).toBeUndefined()
  })

  it("doesn't send a plugin the data context notices caused by its own request", async () => {
    const result = await processAction(
      { action: "create", resource: `dataContext[${datasetName}].item`, values: { a1: "a", a2: "x", a3: 1 } },
      { tile: pluginTile })
    expect(result.success).toBe(true)

    const calls = dataContextNoticeCalls()
    expect(calls.length).toBeGreaterThan(0)
    calls.forEach(([message, , , excludeTileId]) => {
      expect(excludeTileId).toBe(pluginTile.id)
      // as in V2, values is an array of { operation, result }
      expect(Array.isArray(message.values)).toBe(true)
    })
    expect(calls.map(([message]) => message.values[0].operation)).toContain("createCases")
  })

  it("sends every plugin the notices for changes not made by a plugin", async () => {
    await processAction(
      { action: "create", resource: `dataContext[${datasetName}].item`, values: { a1: "b", a2: "y", a3: 2 } })
    const calls = dataContextNoticeCalls()
    expect(calls.length).toBeGreaterThan(0)
    calls.forEach(([, , , excludeTileId]) => expect(excludeTileId).toBeUndefined())

    broadcastSpy.mockClear()
    dataset.applyModelChange(() => dataset.setCaseValues([{ __id__: dataset.items[0].__id__, a3: 99 }]), {
      notify: notification(`dataContextChangeNotice[${datasetName}]`, [{ operation: "updateCases" }])
    })
    expect(dataContextNoticeCalls()[0][3]).toBeUndefined()
  })

  it("doesn't exclude the requester from other notices, and keeps an explicit exclusion", () => {
    withNotificationRequester(pluginTile.id, () => {
      dataset.applyModelChange(() => null, {
        notify: [
          notification("component", { operation: "titleChange" }),
          notification(`dataContextChangeNotice[${datasetName}]`, [{ operation: "updateCases" }])
        ],
        excludeTileId: "OTHER_TILE"
      })
      dataset.applyModelChange(() => null, { notify: notification("component", { operation: "titleChange" }) })
    })
    const excludeTileIds = broadcastSpy.mock.calls.map(([, , , excludeTileId]) => excludeTileId)
    expect(excludeTileIds).toEqual(["OTHER_TILE", "OTHER_TILE", undefined])
  })

  it("doesn't send a plugin the notices for its own coalesced item creates", async () => {
    jest.useFakeTimers()
    const queue = new RequestQueue()
    const disposer = setupRequestQueueProcessor(queue, { tile: pluginTile })
    const responses: unknown[] = []
    try {
      for (let i = 0; i < 3; ++i) {
        queue.push({
          request: { action: "create", resource: `dataContext[${datasetName}].item`, values: { a1: "c", a3: i } },
          callback: response => responses.push(response)
        })
      }
      await jest.runAllTimersAsync()
    } finally {
      disposer()
      jest.useRealTimers()
    }

    expect(responses.length).toBe(3)
    const calls = dataContextNoticeCalls()
    expect(calls.length).toBeGreaterThan(0)
    calls.forEach(([, , , excludeTileId]) => expect(excludeTileId).toBe(pluginTile.id))
  })
})
