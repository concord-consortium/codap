import { action, makeObservable, observable } from "mobx"
import { DIRequest, DIRequestCallback } from "../../data-interactive/data-interactive-types"

type RequestPair = { request: DIRequest, callback: DIRequestCallback }
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
    this.requestQueue.push(pair)
  }


  @action
  clear() {
    this.requestQueue.splice(0)
  }

  /**
   * Process all of the current items in the array. A copy of the current items
   * is made and the current items are cleared.
   *
   * processItems does not wait for async processor functions. It will call the processor
   * function for every item even if one of them is waiting for something to finish.
   *
   * The approach copying the array and then clearing it means the array is only
   * updated one time. So if this function is observed, it will only trigger a single update.
   *
   * @param processor
   */
  processItems(processor: (item: RequestPair) => void) {
    // copy the items
    const items = this.requestQueue.slice(0)
    // clear the items to prepare for the next one to be added
    this.clear()
    // Call the processor for each item
    for (const item of items) {
      processor(item)
    }
  }

}
