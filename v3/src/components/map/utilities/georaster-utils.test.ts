import { makeCoalescingRunner } from "./georaster-utils"

// Flush pending micro- and macro-tasks so awaited renders inside the runner can progress.
const tick = () => new Promise(resolve => setTimeout(resolve, 0))

describe("makeCoalescingRunner", () => {
  it("runs the render for a single request", async () => {
    const render = jest.fn(() => Promise.resolve())
    const run = makeCoalescingRunner(render)

    await run()

    expect(render).toHaveBeenCalledTimes(1)
  })

  it("coalesces requests that arrive during an in-flight render into a single follow-up", async () => {
    const releases: Array<() => void> = []
    const render = jest.fn(() => new Promise<void>(resolve => releases.push(resolve)))
    const run = makeCoalescingRunner(render)

    run()                       // starts render #1 (in flight, awaiting release)
    run(); run(); run(); run()  // burst while #1 is in flight

    // Only the first render is running; the burst has not started new renders.
    expect(render).toHaveBeenCalledTimes(1)

    releases[0]()               // finish render #1
    await tick()

    // The four coalesced requests produce exactly ONE follow-up render, not four.
    expect(render).toHaveBeenCalledTimes(2)

    releases[1]()               // finish render #2
    await tick()

    // Nothing further was queued, so no additional render runs.
    expect(render).toHaveBeenCalledTimes(2)
  })

  it("starts a fresh render for a request that arrives after the runner has gone idle", async () => {
    const releases: Array<() => void> = []
    const render = jest.fn(() => new Promise<void>(resolve => releases.push(resolve)))
    const run = makeCoalescingRunner(render)

    run()
    releases[0]()
    await tick()
    expect(render).toHaveBeenCalledTimes(1)

    // A request after the runner is idle starts immediately rather than being dropped.
    run()
    expect(render).toHaveBeenCalledTimes(2)
    releases[1]()
    await tick()
    expect(render).toHaveBeenCalledTimes(2)
  })

  it("resets after a rejected render so later requests still run", async () => {
    let call = 0
    const render = jest.fn(() => {
      call++
      return call === 1 ? Promise.reject(new Error("boom")) : Promise.resolve()
    })
    const run = makeCoalescingRunner(render)

    await run().catch(() => { /* first render rejects; runner must still reset */ })
    expect(render).toHaveBeenCalledTimes(1)

    await run()
    expect(render).toHaveBeenCalledTimes(2)
  })
})
