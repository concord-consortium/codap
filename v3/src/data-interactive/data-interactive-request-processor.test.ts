import { getSnapshot, onAction } from "mobx-state-tree"
import { RequestQueue } from "../components/web-view/request-queue"
import { appState } from "../models/app-state"
import { SharedDataSet } from "../models/shared/shared-data-set"
import { uiState } from "../models/ui-state"
import { setupTestDataset } from "../test/dataset-test-utils"
import { setupRequestQueueProcessor } from "./data-interactive-request-processor"
import { DIRequest, DIRequestResponse, DISuccessResult } from "./data-interactive-types"

describe("setupRequestQueueProcessor", () => {
  const { content } = appState.document
  content?.createDataSet(getSnapshot(setupTestDataset().dataset))
  const dataset = content!.getFirstSharedModelByType(SharedDataSet)!.dataSet

  let queue: RequestQueue
  let disposer: (() => void) | undefined
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    jest.useFakeTimers()
    // silence the temporary [REQ-DBG] instrumentation logging
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {})
    queue = new RequestQueue()
    disposer = setupRequestQueueProcessor(queue)
  })

  afterEach(() => {
    disposer?.()
    consoleSpy.mockRestore()
    jest.useRealTimers()
  })

  function createItemRequest(values: object, resource = "dataContext[data].item"): DIRequest {
    return { action: "create", resource, values }
  }

  function trackTopLevelActions() {
    const actionNames: string[] = []
    // attach to the document root to avoid MST's non-root onAction warning
    const actionDisposer = onAction(appState.document, call => { actionNames.push(call.name) })
    return { actionNames, actionDisposer }
  }

  it("coalesces queued create-item requests into a single batched model change", async () => {
    const { actionNames, actionDisposer } = trackTopLevelActions()
    const responses: DIRequestResponse[] = []
    const itemCountBefore = dataset.items.length

    queue.push({ request: createItemRequest({ a1: "a", a2: "x", a3: 7 }), callback: r => responses.push(r) })
    queue.push({ request: createItemRequest({ a1: "b", a2: "y", a3: 8 }), callback: r => responses.push(r) })
    queue.push({ request: createItemRequest({ a1: "a", a2: "z", a3: 9 }), callback: r => responses.push(r) })

    // the drain is deferred, so nothing has been processed synchronously
    expect(responses.length).toBe(0)

    await jest.runAllTimersAsync()

    expect(responses.length).toBe(3)
    expect(dataset.items.length).toBe(itemCountBefore + 3)
    // all three creates were applied in ONE model change
    expect(actionNames.filter(actionName => actionName === "applyModelChange").length).toBe(1)
    // each request received its own single item id
    const itemIDs = responses.map(response => (response as DISuccessResult).itemIDs)
    itemIDs.forEach(ids => expect(ids?.length).toBe(1))
    expect(new Set(itemIDs.flat()).size).toBe(3)
    actionDisposer()
  })

  it("caps coalesced batches at 10 and processes one batch per drain tick", async () => {
    const { actionNames, actionDisposer } = trackTopLevelActions()
    const responses: DIRequestResponse[] = []
    for (let i = 0; i < 25; ++i) {
      queue.push({ request: createItemRequest({ a1: "a", a2: "x", a3: 100 + i }), callback: r => responses.push(r) })
    }

    // the first drain tick processes only the first capped batch...
    await jest.advanceTimersToNextTimerAsync()
    expect(responses.length).toBe(10)

    // ...subsequent ticks process the rest
    await jest.runAllTimersAsync()
    expect(responses.length).toBe(25)
    expect(actionNames.filter(actionName => actionName === "applyModelChange").length).toBe(3)
    actionDisposer()
  })

  it("preserves request order across mixed traffic", async () => {
    // characterization test for the drain rewrite: intervening non-creates keep their place
    const order: string[] = []
    let getResponse: DIRequestResponse | undefined
    queue.push({ request: createItemRequest({ a1: "a", a2: "x", a3: 10 }), callback: () => order.push("create1") })
    queue.push({
      request: { action: "get", resource: "dataContext[data]" },
      callback: response => { order.push("get"); getResponse = response }
    })
    queue.push({ request: createItemRequest({ a1: "b", a2: "y", a3: 11 }), callback: () => order.push("create2") })

    await jest.runAllTimersAsync()

    expect(order).toEqual(["create1", "get", "create2"])
    expect((getResponse as DISuccessResult)?.success).toBe(true)
  })

  it("responds to each request individually when the batched create cannot proceed", async () => {
    // characterization test: an unknown dataContext fails per-request, as without coalescing
    const responses: DIRequestResponse[] = []
    const unknownContextItem = "dataContext[unknown].item"
    queue.push({ request: createItemRequest({ a1: "a" }, unknownContextItem), callback: r => responses.push(r) })
    queue.push({ request: createItemRequest({ a1: "b" }, unknownContextItem), callback: r => responses.push(r) })

    await jest.runAllTimersAsync()

    expect(responses.length).toBe(2)
    responses.forEach(response => expect((response as DISuccessResult).success).toBe(false))
  })

  it("waits for blocking cell edits to finish, then drains the accumulated queue coalesced", async () => {
    const { actionNames, actionDisposer } = trackTopLevelActions()
    const responses: DIRequestResponse[] = []

    uiState.setIsEditingCell(true)
    uiState.setIsEditingBlockingCell()
    queue.push({ request: createItemRequest({ a1: "a", a2: "x", a3: 12 }), callback: r => responses.push(r) })
    queue.push({ request: createItemRequest({ a1: "b", a2: "y", a3: 13 }), callback: r => responses.push(r) })

    await jest.runAllTimersAsync()
    expect(responses.length).toBe(0)

    uiState.setIsEditingCell(false)
    await jest.runAllTimersAsync()

    expect(responses.length).toBe(2)
    expect(actionNames.filter(actionName => actionName === "applyModelChange").length).toBe(1)
    actionDisposer()
  })
})
