import { action, makeObservable, observable } from "mobx"
import { DIRequest, DIRequestCallback } from "../../data-interactive/data-interactive-types"

type RequestPair = { request: DIRequest, callback: DIRequestCallback }
export class RequestQueue {
  @observable
  requestQueue: Array<RequestPair> = []

  constructor() {
    makeObservable(this)
  }

  get length() {
    return this.requestQueue.length
  }

  get nextItem() {
    return this.requestQueue[0]
  }

  @action
  push(pair: RequestPair) {
    this.requestQueue.push(pair)
  }

  @action
  shift() {
    return this.requestQueue.shift()
  }
}
