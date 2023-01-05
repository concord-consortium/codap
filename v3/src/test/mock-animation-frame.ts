// inspired by https://stackoverflow.com/a/62282721
export class MockAnimationFrame {
    handleCounter = 0
    queue = new Map<number, FrameRequestCallback>()
    start: number
    time: number

    mockRequest: jest.SpyInstance
    mockCancel: jest.SpyInstance

    constructor() {
      this.start = this.time = performance.now()
      this.mockRequest = jest.spyOn(window, "requestAnimationFrame")
                          .mockImplementation(cb => this.request(cb))
      this.mockCancel = jest.spyOn(window, "cancelAnimationFrame")
                          .mockImplementation(handle => this.cancel(handle))
    }

    clear() {
      this.queue.clear()
      this.handleCounter = 0
    }

    restore() {
      this.clear()
      this.mockRequest.mockRestore()
      this.mockCancel.mockRestore()
    }

    get hasRequests() {
      return this.queue.size > 0
    }

    request(callback: FrameRequestCallback) {
      const handle = this.handleCounter++
      this.queue.set(handle, callback)
      return handle
    }

    cancel(handle: number) {
      this.queue.delete(handle)
    }

    // default elapsed time is based on 60Hz
    triggerNext(elapsed = 1000 / 60) {
      this.time += elapsed

      const nextEntry = this.queue.entries().next().value
      if (!nextEntry) return this.time

      const [handle, callback] = nextEntry

      callback(this.time)

      this.queue.delete(handle)

      // return the time passed to callback
      return this.time
    }

    triggerAll(elapsed = 1000 / 60) {
      while (this.queue.size > 0) this.triggerNext(elapsed)
      // return the time passed to callback
      return this.time
    }
}
