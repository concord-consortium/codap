import { CloudFileManager } from "@concord-consortium/cloud-file-manager"
import { reaction, IReactionDisposer } from "mobx"
import { RequestQueue } from "../components/web-view/request-queue"
import { DEBUG_PLUGINS, debugLog } from "../lib/debug"
import { ITileModel } from "../models/tiles/tile-model"
import { uiState } from "../models/ui-state"
import { t } from "../utilities/translation/translate"
import { isV2CaseTableComponent } from "./data-interactive-component-types"
import { getDIHandler } from "./data-interactive-handler"
import {
  DIAction, DIHandlerFnResult, DIRequest, DIRequestResponse
} from "./data-interactive-types"
import { errorResult } from "./handlers/di-results"
import { parseResourceSelector, resolveResources } from "./resource-parser"
import { prf } from "../utilities/profiler" // PERF-DBG

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

  // PERF-DBG: split resolve vs handler to locate per-request cost
  const resourceSelector = parseResourceSelector(action.resource)
  const resources = prf.measure("DI.processAction[resolve]", () =>
    resolveResources(resourceSelector, action.action, tile, cfm))
  const type = resourceSelector.type ?? ""
  const a = action.action
  const func = getDIHandler(type)?.[a]
  if (!func) return errorResult(t("V3.DI.Error.unsupportedAction", { vars: [a, type] }))

  const actionResult = await prf.measure("DI.processAction[handler]", () => func?.(resources, action.values))
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
 * Returns a disposer function to clean up the reaction.
 */
export function setupRequestQueueProcessor(
  requestQueue: RequestQueue,
  options: SetupRequestProcessorOptions = {}
): IReactionDisposer {
  const {
    name = "DataInteractive request processor",
    onProcessingStart,
    onRequestProcessed,
    ...processOptions
  } = options

  return reaction(
    () => ({
      canProcessRequest: !uiState.isEditingBlockingCell,
      queueLength: requestQueue.length
    }),
    ({ canProcessRequest, queueLength }) => {
      if (!canProcessRequest || queueLength === 0) return

      uiState.captureEditingStateBeforeInterruption()
      let tableModified = false

      requestQueue.processItems(async ({ request, callback, enqueuedAt, seq }) => {
        debugLog(DEBUG_PLUGINS, `${name} processing: ${JSON.stringify(request)}`)

        onProcessingStart?.()

        // PERF-DBG: measure receive->respond latency to detect "falling behind" during streaming
        const reqDbgStart = performance.now()
        const reqDbgQueueWait = enqueuedAt != null ? reqDbgStart - enqueuedAt : 0
        const reqDbgDescribe = (r: DIRequest) => Array.isArray(r)
          ? `batch(${r.length}):${(r[0] as any)?.action} ${(r[0] as any)?.resource}`
          : `${(r as any)?.action} ${(r as any)?.resource}`

        // PERF-DBG: syncMs = synchronous prefix of processRequest (before its promise is returned);
        // asyncMs = the await remainder (microtasks + any rendering that runs before resolution)
        const reqDbgPromise = processRequest(request, processOptions)
        const reqDbgSyncEnd = performance.now()
        const result = await reqDbgPromise

        // PERF-DBG
        const reqDbgNow = performance.now()
        // eslint-disable-next-line no-console
        console.log(`[REQ-DBG] seq=${seq} ${reqDbgDescribe(request)} ` +
          `queueWaitMs=${reqDbgQueueWait.toFixed(1)} processMs=${(reqDbgNow - reqDbgStart).toFixed(1)} ` +
          `syncMs=${(reqDbgSyncEnd - reqDbgStart).toFixed(1)} asyncMs=${(reqDbgNow - reqDbgSyncEnd).toFixed(1)} ` +
          `totalMs=${(enqueuedAt != null ? reqDbgNow - enqueuedAt : 0).toFixed(1)} backlog=${requestQueue.length}`)

        // Check if any action may have modified table data
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
        callback(result)

        onRequestProcessed?.(request, result)
      })

      if (tableModified) uiState.incrementInterruptionCount()
    },
    { name }
  )
}
