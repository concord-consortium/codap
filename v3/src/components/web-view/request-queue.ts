import { action, makeObservable, observable } from "mobx"
import { DIRequest, DIRequestCallback } from "../../data-interactive/data-interactive-types"

// PERF-DBG: enqueuedAt/seq let the processor measure receive->respond latency (temporary diagnostic)
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
    pair.enqueuedAt = performance.now() // PERF-DBG
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
