import { action, makeObservable, observable } from "mobx"
import { DIRequest, DIRequestCallback } from "../../data-interactive/data-interactive-types"

type RequestPair = { request: DIRequest, callback: DIRequestCallback }
export class RequestQueue {
  requestQueue: Array<RequestPair> = []

  constructor() {
    makeObservable(this, {
      requestQueue: observable,
      push: action,
      shift: action
    })
  }

  get length() {
    return this.requestQueue.length
  }

  get nextItem() {
    return this.requestQueue[0]
  }

  push(pair: RequestPair) {
    this.requestQueue.push(pair)
  }

  shift() {
    return this.requestQueue.shift()
  }
}
