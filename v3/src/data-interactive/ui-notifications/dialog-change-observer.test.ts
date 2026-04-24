import {
  _getScopedObserverCount, _resetDialogChangeObserver, installDialogChangeObserver, onDialogAppear, onDialogDisappear
} from "./dialog-change-observer"
import { UiNotificationMonitorManager } from "./ui-notification-monitor-manager"
import { UiDialogChangeNotice, UiNotice } from "./ui-notification-types"

function awaitMutations(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 10))
}

function makeManagerWithCapture() {
  const manager = new UiNotificationMonitorManager({ debounceMs: 5 })
  const delivered: UiNotice[] = []
  manager.setDocumentProvider(() => ({
    content: {
      broadcastMessage: (payload: Record<string, unknown>) => {
        delivered.push((payload as { values: UiNotice }).values)
      }
    }
  }))
  return { manager, delivered }
}

describe("dialog-change-observer", () => {
  let installed: { uninstall: () => void } | undefined
  let dialogEl: HTMLElement

  beforeEach(() => {
    document.body.innerHTML = ""
    _resetDialogChangeObserver()
  })

  afterEach(() => {
    installed?.uninstall()
    installed = undefined
    if (dialogEl) onDialogDisappear(dialogEl)
    document.body.innerHTML = ""
    _resetDialogChangeObserver()
  })

  it("fires dialogChange with change.kind 'attribute' for testid flip", async () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["dialogChange"] })
    installed = installDialogChangeObserver(manager)

    document.body.innerHTML = `
      <section class="modal-dialog-container" role="dialog" data-testid="cfm-dialog-share">
        <button data-testid="cfm-dialog-share-enable-button">Enable</button>
      </section>`
    dialogEl = document.querySelector("section") as HTMLElement
    onDialogAppear(dialogEl, { testId: "cfm-dialog-share" })

    const btn = document.querySelector("button") as HTMLElement
    btn.setAttribute("data-testid", "cfm-dialog-share-update-button")
    await awaitMutations()
    await awaitMutations()

    const dc = delivered.find(d => d.eventType === "dialogChange") as UiDialogChangeNotice
    expect(dc).toBeTruthy()
    const change = dc.change as
      { kind: "attribute"; name: string; before: string | null; after: string | null }
    expect(change.kind).toBe("attribute")
    expect(change.name).toBe("data-testid")
    expect(change.before).toBe("cfm-dialog-share-enable-button")
    expect(change.after).toBe("cfm-dialog-share-update-button")
    // control.testId reflects post-mutation identity
    expect(dc.control.testId).toBe("cfm-dialog-share-update-button")
    expect(dc.dialogTarget.testId).toBe("cfm-dialog-share")
  })

  it("fires dialogChange for disabled attribute flip", async () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["dialogChange"] })
    installed = installDialogChangeObserver(manager)

    document.body.innerHTML = `
      <section class="modal-dialog-container" role="dialog" data-testid="cfm-dialog-x">
        <button data-testid="cfm-btn" aria-disabled="true"></button>
      </section>`
    dialogEl = document.querySelector("section") as HTMLElement
    onDialogAppear(dialogEl, { testId: "cfm-dialog-x" })
    const btn = document.querySelector("button") as HTMLElement
    btn.setAttribute("aria-disabled", "false")
    await awaitMutations()

    const dc = delivered.find(d => d.eventType === "dialogChange") as UiDialogChangeNotice
    expect(dc).toBeTruthy()
    const change = dc.change as
      { kind: "attribute"; name: string; before: string | null; after: string | null }
    expect(change.name).toBe("aria-disabled")
    expect(change.before).toBe("true")
    expect(change.after).toBe("false")
  })

  it("tears down when dialog is removed", async () => {
    const { manager } = makeManagerWithCapture()
    installed = installDialogChangeObserver(manager)

    document.body.innerHTML = `
      <section class="modal-dialog-container" role="dialog" data-testid="cfm-dialog-y">
      </section>`
    dialogEl = document.querySelector("section") as HTMLElement
    onDialogAppear(dialogEl, { testId: "cfm-dialog-y" })
    expect(_getScopedObserverCount()).toBe(1)
    onDialogDisappear(dialogEl)
    expect(_getScopedObserverCount()).toBe(0)
  })

  it("fires dialogChange with change.kind 'value' for value attribute flip", async () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["dialogChange"] })
    installed = installDialogChangeObserver(manager)

    document.body.innerHTML = `
      <section class="modal-dialog-container" role="dialog" data-testid="cfm-dialog-v">
        <input data-testid="cfm-dialog-v-input" value="a" />
      </section>`
    dialogEl = document.querySelector("section") as HTMLElement
    onDialogAppear(dialogEl, { testId: "cfm-dialog-v" })

    const input = document.querySelector("input") as HTMLInputElement
    input.setAttribute("value", "b")
    await awaitMutations()

    const dc = delivered.find((d): d is UiDialogChangeNotice =>
      d.eventType === "dialogChange" && d.change.kind === "value"
    )
    expect(dc).toBeTruthy()
    if (!dc) return
    const change = dc.change as { kind: "value"; before: string; after: string }
    expect(change.kind).toBe("value")
    expect(change.before).toBe("a")
    expect(change.after).toBe("b")
    expect(dc.control.testId).toBe("cfm-dialog-v-input")
    expect(dc.control.tag).toBe("INPUT")
  })

  it("fires dialogChange with change.kind 'label' when control text content mutates", async () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["dialogChange"] })
    installed = installDialogChangeObserver(manager)

    document.body.innerHTML = `
      <section class="modal-dialog-container" role="dialog" data-testid="cfm-dialog-l">
        <button data-testid="cfm-btn-l"><span>Old</span></button>
      </section>`
    dialogEl = document.querySelector("section") as HTMLElement
    onDialogAppear(dialogEl, { testId: "cfm-dialog-l" })

    const span = document.querySelector("span") as HTMLElement
    const textNode = span.firstChild as Text
    textNode.data = "New"
    await awaitMutations()

    const dc = delivered.find((d): d is UiDialogChangeNotice =>
      d.eventType === "dialogChange" && d.change.kind === "label"
    )
    expect(dc).toBeTruthy()
    if (!dc) return
    const change = dc.change as { kind: "label"; before: string; after: string }
    expect(change.kind).toBe("label")
    expect(change.after).toBe("New")
    // characterData bubbles to the nearest [data-testid] ancestor control
    expect(dc.control.testId).toBe("cfm-btn-l")
    expect(dc.control.tag).toBe("BUTTON")
  })

  it("uninstalling manager clears all scoped observers", () => {
    const { manager } = makeManagerWithCapture()
    const inst = installDialogChangeObserver(manager)

    document.body.innerHTML = `
      <section class="modal-dialog-container" role="dialog" data-testid="cfm-dialog-z">
      </section>
      <section class="modal-dialog-container" role="dialog" data-testid="cfm-dialog-z2">
      </section>`
    const d1 = document.querySelectorAll("section")[0]
    const d2 = document.querySelectorAll("section")[1]
    onDialogAppear(d1, { testId: "cfm-dialog-z" })
    onDialogAppear(d2, { testId: "cfm-dialog-z2" })
    expect(_getScopedObserverCount()).toBe(2)
    inst.uninstall()
    expect(_getScopedObserverCount()).toBe(0)
    installed = undefined
  })
})
