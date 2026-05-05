import { renderHook } from "@testing-library/react"
import { useTargetWatcher } from "./use-target-watcher"

describe("useTargetWatcher", () => {
  it("fires onRemoved synchronously at mount when target is already disconnected", () => {
    const target = document.createElement("div")
    // not appended to document — target.isConnected === false
    const onRemoved = jest.fn()
    renderHook(() => useTargetWatcher(target, onRemoved))
    expect(onRemoved).toHaveBeenCalledTimes(1)
  })

  it("fires onRemoved exactly once when the target is removed after mount", async () => {
    const target = document.createElement("div")
    document.body.appendChild(target)
    const onRemoved = jest.fn()
    renderHook(() => useTargetWatcher(target, onRemoved))
    expect(onRemoved).not.toHaveBeenCalled()

    target.remove()
    // MutationObserver callbacks are microtask-scheduled
    await Promise.resolve()
    expect(onRemoved).toHaveBeenCalledTimes(1)

    // Further mutations should not retrigger
    document.body.appendChild(document.createElement("span"))
    await Promise.resolve()
    expect(onRemoved).toHaveBeenCalledTimes(1)
  })

  it("detects ancestor detach (target's parent removed)", async () => {
    // Locks in the Decision in CODAP-1231-replace-driverjs.md: observe document.body
    // rather than target.parentElement, because parent removal leaves
    // target.parentElement unchanged but target.isConnected flips to false.
    const parent = document.createElement("div")
    const target = document.createElement("div")
    parent.appendChild(target)
    document.body.appendChild(parent)
    const onRemoved = jest.fn()
    renderHook(() => useTargetWatcher(target, onRemoved))

    parent.remove()
    await Promise.resolve()
    expect(onRemoved).toHaveBeenCalledTimes(1)
  })

  it("disconnects the observer on unmount", () => {
    const target = document.createElement("div")
    document.body.appendChild(target)
    const disconnectSpy = jest.spyOn(MutationObserver.prototype, "disconnect")
    const onRemoved = jest.fn()
    const { unmount } = renderHook(() => useTargetWatcher(target, onRemoved))
    disconnectSpy.mockClear()
    unmount()
    expect(disconnectSpy).toHaveBeenCalled()
    disconnectSpy.mockRestore()
  })
})
