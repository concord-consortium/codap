import { action, makeObservable, observable } from "mobx"
import { DIRequest, DIRequestCallback } from "../../data-interactive/data-interactive-types"

// enqueuedAt is the performance.now() timestamp when the request was queued; the request
// processor uses the head request's wait time to size coalesced batches (CODAP-1408)
// PERF-DBG: seq lets the processor log per-request latency (temporary diagnostic)
export type RequestPair = { request: DIRequest, callback: DIRequestCallback, enqueuedAt?: number, seq?: number }
let reqDbgSeq = 0 // PERF-DBG
export class RequestQueue {
  @observable.shallow
  requestQueue: Array<RequestPair> = []

  constructor() {
    makeObservable(this)
  }

  get length() {
    return this.requestQueue.length
  }

  @action
  push(pair: RequestPair) {
    pair.enqueuedAt = performance.now()
    pair.seq = ++reqDbgSeq // PERF-DBG
    this.requestQueue.push(pair)
  }


  @action
  clear() {
    this.requestQueue.splice(0)
  }

  get items(): readonly RequestPair[] {
    return this.requestQueue
  }

  /**
   * Remove and return the first `count` items in the queue.
   */
  @action
  takeItems(count: number): RequestPair[] {
    return this.requestQueue.splice(0, count)
  }

}
