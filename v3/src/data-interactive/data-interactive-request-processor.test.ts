import { getSnapshot, onAction } from "mobx-state-tree"
import { RequestQueue } from "../components/web-view/request-queue"
import { appState } from "../models/app-state"
import { SharedDataSet } from "../models/shared/shared-data-set"
import { uiState } from "../models/ui-state"
import { setupTestDataset } from "../test/dataset-test-utils"
import { registerDIHandler } from "./data-interactive-handler"
import * as itemHandler from "./handlers/item-handler"
import { setupRequestQueueProcessor } from "./data-interactive-request-processor"
import { DIRequest, DIRequestResponse, DISuccessResult } from "./data-interactive-types"

describe("setupRequestQueueProcessor", () => {
  const { content } = appState.document
  content?.createDataSet(getSnapshot(setupTestDataset().dataset))
  const dataset = content!.getFirstSharedModelByType(SharedDataSet)!.dataSet
  // use the actual name in resource strings in case createDataSet renamed for uniqueness
  const datasetName = dataset.name

  let queue: RequestQueue
  let disposer: (() => void) | undefined

  beforeEach(() => {
    jest.useFakeTimers()
    queue = new RequestQueue()
    disposer = setupRequestQueueProcessor(queue)
  })

  afterEach(() => {
    disposer?.()
    jest.useRealTimers()
  })

  function createItemRequest(values: object, resource = `dataContext[${datasetName}].item`): DIRequest {
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

  it("processes one batch of at least 5 creates per drain tick", async () => {
    const { actionNames, actionDisposer } = trackTopLevelActions()
    const responses: DIRequestResponse[] = []
    for (let i = 0; i < 25; ++i) {
      queue.push({ request: createItemRequest({ a1: "a", a2: "x", a3: 100 + i }), callback: r => responses.push(r) })
    }

    // the first drain tick processes only the first batch...
    await jest.advanceTimersToNextTimerAsync()
    expect(responses.length).toBe(5)

    // ...subsequent ticks process the rest
    await jest.runAllTimersAsync()
    expect(responses.length).toBe(25)
    expect(actionNames.filter(actionName => actionName === "applyModelChange").length).toBe(5)
    actionDisposer()
  })

  it("grows the batch size in proportion to the backlog", async () => {
    const { actionNames, actionDisposer } = trackTopLevelActions()
    const responses: DIRequestResponse[] = []
    for (let i = 0; i < 150; ++i) {
      queue.push({ request: createItemRequest({ a1: "a", a2: "x", a3: 300 + i }), callback: r => responses.push(r) })
    }

    // the first drain tick takes ceil(150/10) = 15 requests to begin catching up...
    await jest.advanceTimersToNextTimerAsync()
    expect(responses.length).toBe(15)

    // ...batches shrink toward the minimum as the backlog drains:
    // 15, 14, 13, 11, 10, 9, 8, 7, 7, 6, then ten 5s = 20 batches in all
    await jest.runAllTimersAsync()
    expect(responses.length).toBe(150)
    expect(actionNames.filter(actionName => actionName === "applyModelChange").length).toBe(20)
    actionDisposer()
  })

  it("drains a backlog whose head request has waited too long in a single batch", async () => {
    const { actionNames, actionDisposer } = trackTopLevelActions()
    const responses: DIRequestResponse[] = []

    // requests accumulate, unprocessed, while a blocking cell edit is in progress
    uiState.setIsEditingCell(true)
    uiState.setIsEditingBlockingCell()
    for (let i = 0; i < 50; ++i) {
      queue.push({ request: createItemRequest({ a1: "a", a2: "x", a3: 500 + i }), callback: r => responses.push(r) })
    }
    await jest.advanceTimersByTimeAsync(1000)
    expect(responses.length).toBe(0)

    // once unblocked, the queue's age demands a single catch-up batch rather than
    // the ten batches that backlog-proportional sizing alone would produce
    uiState.setIsEditingCell(false)
    await jest.runAllTimersAsync()
    expect(responses.length).toBe(50)
    expect(actionNames.filter(actionName => actionName === "applyModelChange").length).toBe(1)
    actionDisposer()
  })

  it("preserves request order across mixed traffic", async () => {
    // characterization test for the drain rewrite: intervening non-creates keep their place
    const order: string[] = []
    let getResponse: DIRequestResponse | undefined
    queue.push({ request: createItemRequest({ a1: "a", a2: "x", a3: 10 }), callback: () => order.push("create1") })
    queue.push({
      request: { action: "get", resource: `dataContext[${datasetName}]` },
      callback: response => { order.push("get"); getResponse = response }
    })
    queue.push({ request: createItemRequest({ a1: "b", a2: "y", a3: 11 }), callback: () => order.push("create2") })

    await jest.runAllTimersAsync()

    expect(order).toEqual(["create1", "get", "create2"])
    expect((getResponse as DISuccessResult)?.success).toBe(true)
  })

  it("responds with an error when a handler throws, and continues processing", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
    registerDIHandler("testThrower", { get: () => { throw new Error("handler boom") } })
    const responses: DIRequestResponse[] = []
    queue.push({ request: { action: "get", resource: "testThrower" }, callback: r => responses.push(r) })
    queue.push({ request: createItemRequest({ a1: "a", a2: "x", a3: 600 }), callback: r => responses.push(r) })

    await jest.runAllTimersAsync()

    expect(responses.length).toBe(2)
    expect((responses[0] as DISuccessResult).success).toBe(false)
    expect((responses[1] as DISuccessResult).success).toBe(true)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    warnSpy.mockRestore()
  })

  it("a throwing response callback does not prevent later responses", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
    const responses: DIRequestResponse[] = []
    // these two creates coalesce into one batch; the first member's callback throws
    queue.push({ request: createItemRequest({ a1: "a", a2: "x", a3: 700 }),
      callback: () => { throw new Error("callback boom") } })
    queue.push({ request: createItemRequest({ a1: "b", a2: "y", a3: 701 }), callback: r => responses.push(r) })

    await jest.runAllTimersAsync()

    expect(responses.length).toBe(1)
    expect((responses[0] as DISuccessResult).success).toBe(true)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    warnSpy.mockRestore()
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

  it("does not re-add cases when the batched create throws after committing", async () => {
    // applyModelChange is not transactional on throw: a batched create can commit its cases
    // and then fail (e.g. validateCases or the notification builder throws). The processor
    // must NOT fall back to processing the members individually in that case, since that
    // would add the already-committed cases a second time (CODAP-1408 data-duplication risk).
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
    const itemCountBefore = dataset.items.length
    // Spy only intercepts the processor's exported-binding call; the per-member fallback's
    // diItemHandler.create calls the module-local createItemsInSegments, which is unaffected —
    // so on the buggy code the fallback would really re-add these cases.
    const createSpy = jest.spyOn(itemHandler, "createItemsInSegments").mockImplementation((dc, segments) => {
      dc.addCases(segments.flat().map(() => ({})))
      throw new Error("post-commit boom")
    })

    const responses: DIRequestResponse[] = []
    queue.push({ request: createItemRequest({ a1: "a", a2: "x", a3: 800 }), callback: r => responses.push(r) })
    queue.push({ request: createItemRequest({ a1: "b", a2: "y", a3: 801 }), callback: r => responses.push(r) })

    await jest.runAllTimersAsync()

    // each member is answered exactly once, with an error rather than a phantom success
    expect(responses.length).toBe(2)
    responses.forEach(response => expect((response as DISuccessResult).success).toBe(false))
    // the committed cases are not duplicated by a fallback re-add
    expect(dataset.items.length).toBe(itemCountBefore + 2)

    createSpy.mockRestore()
    warnSpy.mockRestore()
  })

  it("does not drain again after disposal when a request arrives mid-process", async () => {
    // Race guard: a drain that is mid-await when the processor is disposed must not let its
    // trailing scheduleDrain() (in drain()'s finally) process a request that arrived after
    // disposal. Hold a single get handler mid-await, dispose, push a request, then release.
    let release = () => {}
    const gate = new Promise<void>(resolve => { release = resolve })
    registerDIHandler("gatedTester", { get: async () => { await gate; return { success: true } } })
    const responses: DIRequestResponse[] = []

    // this get is taken and drains the queue to empty, then awaits the gated handler
    queue.push({ request: { action: "get", resource: "gatedTester" }, callback: r => responses.push(r) })
    await jest.advanceTimersByTimeAsync(0) // let the drain start and reach the await

    // tear down the processor while the drain is mid-await
    disposer?.()
    disposer = undefined
    // a request arrives after disposal (e.g. an in-flight postMessage)
    queue.push({ request: createItemRequest({ a1: "z" }), callback: r => responses.push(r) })

    release()
    await jest.runAllTimersAsync()

    // the gated get completes; the post-disposal request is NOT processed
    expect(responses.length).toBe(1)
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
