import { CloudFileManager } from "@concord-consortium/cloud-file-manager"
import { reaction } from "mobx"
import { RequestPair, RequestQueue } from "../components/web-view/request-queue"
import { DEBUG_NO_COALESCE, DEBUG_PLUGINS, debugLog } from "../lib/debug"
import { ITileModel } from "../models/tiles/tile-model"
import { uiState } from "../models/ui-state"
import { t } from "../utilities/translation/translate"
import { isV2CaseTableComponent } from "./data-interactive-component-types"
import { getDIHandler } from "./data-interactive-handler"
import {
  DIAction, DIHandlerFnResult, DIRequest, DIRequestCallback, DIRequestResponse
} from "./data-interactive-types"
import { createItemsInSegments } from "./handlers/item-handler"
import { errorResult } from "./handlers/di-results"
import { RequestWorkUnit, takeNextWorkUnit, workUnitSize } from "./request-coalescer"
import { parseResourceSelector, resolveResources } from "./resource-parser"

import "./register-handlers"

export interface ProcessActionOptions {
  tile?: ITileModel
  cfm?: CloudFileManager
}

/**
 * Process a single data-interactive action and return the result.
 * This is the core logic shared between plugin tiles and the embedded server.
 */
export async function processAction(
  action: DIAction,
  options: ProcessActionOptions = {}
): Promise<DIHandlerFnResult> {
  const { tile, cfm } = options

  if (!action) return errorResult(t("V3.DI.Error.noAction"))

  const { action: _action, values } = action

  // V2 compatibility: Request is for creating a caseTable with name but no dataContext
  if (_action === "create" && isV2CaseTableComponent(values) && !values.dataContext && values.name) {
    values.dataContext = values.name
  }

  const resourceSelector = parseResourceSelector(action.resource)
  const resources = resolveResources(resourceSelector, action.action, tile, cfm)
  const type = resourceSelector.type ?? ""
  const a = action.action
  const func = getDIHandler(type)?.[a]
  if (!func) return errorResult(t("V3.DI.Error.unsupportedAction", { vars: [a, type] }))

  const actionResult = await func(resources, action.values)
  return actionResult ?? errorResult(t("V3.DI.Error.undefinedResponse"))
}

/**
 * Process a data-interactive request (which may be a single action or an array of actions).
 */
export async function processRequest(
  request: DIRequest,
  options: ProcessActionOptions = {}
): Promise<DIRequestResponse> {
  if (Array.isArray(request)) {
    const results: DIHandlerFnResult[] = []
    for (const action of request) {
      results.push(await processAction(action, options))
    }
    return results
  } else {
    return processAction(request, options)
  }
}

/**
 * Check if an action may have modified table data.
 */
function mayHaveModifiedTable(action: DIAction, result: DIHandlerFnResult): boolean {
  if (!result) return false
  const resourceSelector = parseResourceSelector(action.resource)
  const type = resourceSelector.type ?? ""
  const a = action.action
  return ["create", "delete", "notify"].includes(a) &&
    !["component", "global", "interactiveFrame"].includes(type)
}

// The batch size — the number of create-item requests merged into one batched model change —
// adapts to the backlog and to how long requests have been waiting. Each drain tick takes up
// to 1/kCoalesceBacklogDivisor of the queued requests, with a floor of
// kMinCoalescedCreateRequests. Since the drain processes one batch per macrotask, small
// batches preserve the visible sense of streaming (points/rows appear in chunks), while a
// large backlog grows the batch so processing keeps up with the stream. Machine speed is
// adapted to implicitly: on a slower machine each tick takes longer, more requests accumulate
// between ticks, and the batch grows accordingly. In addition, as the head request's queue
// wait approaches kCoalesceMaxQueueWaitMs, the batch ramps up to the entire backlog — timely
// acknowledgment (plugin request timers are conventionally ~2s) outranks streaming
// granularity. Because a flood's tail requests have been waiting since the flood began, this
// also accelerates the drain's tail rather than dribbling it out at the minimum batch size.
const kMinCoalescedCreateRequests = 5
const kCoalesceBacklogDivisor = 10
const kCoalesceMaxQueueWaitMs = 1000

export interface SetupRequestProcessorOptions extends ProcessActionOptions {
  /** Name for the reaction (for debugging) */
  name?: string
  /** Callback when processing starts */
  onProcessingStart?: () => void
  /** Callback when a request is processed */
  onRequestProcessed?: (request: DIRequest, result: DIRequestResponse) => void
}

/**
 * Set up a reaction to process requests from a queue.
 *
 * The drain is deferred by a macrotask (setTimeout 0) rather than performed inline by the
 * reaction. Plugin requests arrive one per postMessage event, so an inline drain would always
 * see a single request; deferring lets already-delivered message events accumulate in the
 * queue, where consecutive single-item create requests can then be coalesced into one batched
 * model change — one round of tile reactivity per batch instead of per item (CODAP-1408).
 *
 * Returns a disposer function to clean up the reaction (and any pending drain).
 */
export function setupRequestQueueProcessor(
  requestQueue: RequestQueue,
  options: SetupRequestProcessorOptions = {}
): () => void {
  const {
    name = "DataInteractive request processor",
    onProcessingStart,
    onRequestProcessed,
    ...processOptions
  } = options

  let drainTimer: ReturnType<typeof setTimeout> | undefined
  let isDraining = false

  // Deliver a response to a plugin, guarding against a throwing callback so that one
  // misbehaving consumer can't prevent later responses from being delivered.
  function respond(callback: DIRequestCallback, result: DIRequestResponse) {
    try {
      callback(result)
    } catch (error) {
      console.warn(`${name} exception in response callback`, error)
    }
  }

  // Process a single request just as the pre-coalescing implementation did,
  // returning whether the request may have modified table data.
  async function processSingleRequest({ request, callback }: RequestPair): Promise<boolean> {
    debugLog(DEBUG_PLUGINS, `${name} processing: ${JSON.stringify(request)}`)

    onProcessingStart?.()

    // A throwing handler shouldn't leave the request without a response (the plugin would
    // wait out its request timer) or interrupt the drain — respond with an error instead.
    let result: DIRequestResponse
    try {
      result = await processRequest(request, processOptions)
    } catch (error) {
      console.warn(`${name} exception processing request`, error)
      result = errorResult(t("V3.DI.Error.exceptionProcessingRequest"))
    }

    // Check if any action may have modified table data
    let tableModified = false
    if (Array.isArray(request) && Array.isArray(result)) {
      for (let i = 0; i < request.length; i++) {
        if (mayHaveModifiedTable(request[i], result[i])) {
          tableModified = true
          break
        }
      }
    } else if (!Array.isArray(request) && !Array.isArray(result)) {
      if (mayHaveModifiedTable(request, result)) {
        tableModified = true
      }
    }

    debugLog(DEBUG_PLUGINS, `${name} responding with`, result)
    respond(callback, result)

    onRequestProcessed?.(request, result)

    return tableModified
  }

  // Execute a coalesced run of create-item requests as one batched model change, responding
  // to each member with its own per-segment result.
  async function processCoalescedRun(unit: Extract<RequestWorkUnit<RequestPair>, { type: "coalesced" }>) {
    const { resource, members, segments } = unit

    const { dataContext } = resolveResources(
      parseResourceSelector(resource), "create", processOptions.tile, processOptions.cfm)

    // When the dataContext can't be resolved, the batched create never runs and nothing is
    // mutated, so it's safe to process the members individually for exact per-request semantics
    // (each gets its own dataContextNotFoundResult).
    if (!dataContext) {
      let tableModified = false
      for (const member of members) {
        tableModified = (await processSingleRequest(member)) || tableModified
      }
      return tableModified
    }

    // Once the dataContext resolves, the batched create mutates the dataset inside a single
    // applyModelChange, which is NOT transactional on throw — so a failure may leave cases
    // already committed. We must therefore never fall back to re-processing the members
    // individually here (that would re-add the committed cases — silent data duplication);
    // respond with an error to each member instead. results is undefined when the create
    // threw; the not-all-success branch is currently unreachable (createItemsInSegments
    // returns all-success or throws) but is handled the same way for safety.
    let results: DIHandlerFnResult[] | undefined
    try {
      results = createItemsInSegments(dataContext, segments)
    } catch (error) {
      console.warn(`${name} exception in coalesced create`, error)
    }
    const succeeded = results?.length === members.length && results.every(result => result.success)
    members.forEach((member, index) => {
      debugLog(DEBUG_PLUGINS, `${name} processing (coalesced):`, member.request)
      onProcessingStart?.()
      const result = succeeded ? results![index] : errorResult(t("V3.DI.Error.exceptionProcessingRequest"))
      debugLog(DEBUG_PLUGINS, `${name} responding with`, result)
      respond(member.callback, result)
      onRequestProcessed?.(member.request, result)
    })
    // the batched create may have modified the table even when it ultimately failed
    return true
  }

  async function drain() {
    drainTimer = undefined
    // if a drain is already in progress, its trailing check will reschedule as needed
    if (isDraining || uiState.isEditingBlockingCell || requestQueue.length === 0) return
    isDraining = true
    try {
      uiState.captureEditingStateBeforeInterruption()

      // Take ONE work unit per drain tick, leaving the rest in the queue, so the browser can
      // render between batches (preserving the visible sense of streaming) and requests that
      // arrive between ticks can coalesce into later batches. The batch size adapts to the
      // backlog and the head request's queue wait (see kCoalesceBacklogDivisor above).
      // DEBUG_NO_COALESCE ("noCoalesce" debug flag) limits runs to one request, processing
      // every request individually for A/B comparison (page reload required to change).
      const headEnqueuedAt = requestQueue.items[0]?.enqueuedAt
      const headWaitMs = headEnqueuedAt != null ? performance.now() - headEnqueuedAt : 0
      const urgency = Math.min(1, headWaitMs / kCoalesceMaxQueueWaitMs)
      const maxRunLength = DEBUG_NO_COALESCE
        ? 1
        : Math.max(
            kMinCoalescedCreateRequests,
            Math.ceil(requestQueue.length / kCoalesceBacklogDivisor),
            Math.ceil(requestQueue.length * urgency))
      const unit = takeNextWorkUnit(requestQueue.items, maxRunLength)
      if (!unit) return
      requestQueue.takeItems(workUnitSize(unit))

      const tableModified = unit.type === "coalesced"
        ? await processCoalescedRun(unit)
        : await processSingleRequest(unit.item)

      if (tableModified) uiState.incrementInterruptionCount()
    } finally {
      isDraining = false
      // pushes that arrived during the drain re-fire the reaction, but any drain it scheduled
      // while we were draining bailed above, so check for leftover work here
      if (requestQueue.length > 0 && !uiState.isEditingBlockingCell) scheduleDrain()
    }
  }

  // Single-timer invariant: at most one drain timer is ever pending, and `drainTimer` always
  // holds it (scheduleDrain only schedules when it's null; drain() nulls it on entry). This is
  // what makes disposal safe without a separate "disposed" flag — see the disposer below.
  function scheduleDrain() {
    if (drainTimer == null) {
      drainTimer = setTimeout(drain, 0)
    }
  }

  const reactionDisposer = reaction(
    () => ({
      canProcessRequest: !uiState.isEditingBlockingCell,
      queueLength: requestQueue.length
    }),
    ({ canProcessRequest, queueLength }) => {
      if (!canProcessRequest || queueLength === 0) return
      scheduleDrain()
    },
    { name }
  )

  return () => {
    // Clearing the one pending timer (the single-timer invariant guarantees there is at most
    // one, always in drainTimer) plus disposing the reaction is sufficient to fully stop
    // processing — no "disposed" guard is needed. A drain that is already mid-await when this
    // runs finishes its current work unit (its callbacks are wrapped in respond()'s try/catch,
    // so a torn-down endpoint can't throw past them); it does NOT leak a follow-up timer:
    // takeItems() mutates the queue length, which synchronously re-fires the reaction and
    // schedules the next timer *before* the await, so drainTimer is already non-null by the
    // time the trailing scheduleDrain() in drain()'s finally runs — making that call a no-op.
    // We clear that timer here, and the now-disposed reaction can't schedule another.
    if (drainTimer != null) clearTimeout(drainTimer)
    reactionDisposer()
  }
}
