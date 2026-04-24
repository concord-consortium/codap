import { _resetClickListenerState, installClickListener } from "./click-listener"
import { UiNotificationMonitorManager } from "./ui-notification-monitor-manager"
import { UiClickNotice, UiNotice } from "./ui-notification-types"

function makeManagerWithCapture() {
  const manager = new UiNotificationMonitorManager()
  const delivered: UiNotice[] = []
  manager.setDocumentProvider(() => ({
    content: {
      broadcastMessage: (payload: Record<string, unknown>) => {
        const values = (payload as { values: UiNotice }).values
        delivered.push(values)
      }
    }
  }))
  return { manager, delivered }
}

describe("click-listener", () => {
  let installed: { uninstall: () => void } | undefined

  beforeEach(() => {
    document.body.innerHTML = ""
    _resetClickListenerState()
  })

  afterEach(() => {
    installed?.uninstall()
    installed = undefined
    document.body.innerHTML = ""
  })

  it("emits click with via:'pointer' on pointer click", () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["click"] })
    installed = installClickListener(manager)

    document.body.innerHTML = `
      <div class="menu-bar"><button data-testid="x" role="button">OK</button></div>`
    const el = document.querySelector("button")!
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }))

    const click = delivered.find(d => d.eventType === "click") as UiClickNotice | undefined
    expect(click?.eventType).toBe("click")
    expect(click?.target?.testId).toBe("x")
    expect(click?.target?.tag).toBe("BUTTON")
    expect(click?.via).toBe("pointer")
  })

  it("emits click via:'keyboard' + key on Enter keydown and suppresses subsequent click", () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["click"] })
    installed = installClickListener(manager)

    document.body.innerHTML = `<div class="menu-bar"><button data-testid="x">OK</button></div>`
    const el = document.querySelector("button")!
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    // Simulate the browser-synthesized click
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }))

    const clicks = delivered.filter(d => d.eventType === "click") as UiClickNotice[]
    expect(clicks).toHaveLength(1)
    expect(clicks[0].via).toBe("keyboard")
    expect(clicks[0].key).toBe("Enter")
  })

  it("emits click via:'keyboard' with key:' ' for Space", () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["click"] })
    installed = installClickListener(manager)

    document.body.innerHTML = `<div class="menu-bar"><button data-testid="x">OK</button></div>`
    const el = document.querySelector("button")!
    el.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }))
    const clicks = delivered.filter(d => d.eventType === "click") as UiClickNotice[]
    expect(clicks).toHaveLength(1)
    expect(clicks[0].key).toBe(" ")
  })

  it("suppress flag is per-element (keyboard on A doesn't suppress pointer click on B)", () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["click"] })
    installed = installClickListener(manager)

    document.body.innerHTML = `
      <div class="menu-bar">
        <button data-testid="a">A</button>
        <button data-testid="b">B</button>
      </div>`
    const a = document.querySelector('[data-testid="a"]') as HTMLElement
    const b = document.querySelector('[data-testid="b"]') as HTMLElement

    a.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    b.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    a.dispatchEvent(new MouseEvent("click", { bubbles: true })) // should be suppressed

    expect(delivered.filter(d => d.eventType === "click")).toHaveLength(2)
  })

  it("populates target.label via aria-label", () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["click"] })
    installed = installClickListener(manager)

    document.body.innerHTML = `
      <div class="menu-bar"><button data-testid="x" aria-label="Close"></button></div>`
    document.querySelector("button")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }))

    const click = delivered.find(d => d.eventType === "click")
    expect(click?.target?.label).toBe("Close")
  })

  it("skips single-char glyph labels", () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["click"] })
    installed = installClickListener(manager)

    document.body.innerHTML = `<div class="menu-bar"><button data-testid="x">×</button></div>`
    document.querySelector("button")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }))

    const click = delivered.find(d => d.eventType === "click")
    expect(click?.target?.label).toBeUndefined()
  })

  it("sets disabled: true when aria-disabled", () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["click"] })
    installed = installClickListener(manager)

    document.body.innerHTML = `
      <div class="menu-bar"><button data-testid="x" aria-disabled="true">OK</button></div>`
    document.querySelector("button")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }))

    const click = delivered.find(d => d.eventType === "click")
    expect(click?.target?.disabled).toBe(true)
  })

  it("sets interactionKind from role", () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["click"] })
    installed = installClickListener(manager)

    document.body.innerHTML = `
      <div class="menu-bar"><button data-testid="x" role="button">OK</button></div>`
    document.querySelector("button")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }))

    const click = delivered.find(d => d.eventType === "click")
    expect(click?.target?.interactionKind).toBe("button")
  })

  it("sets interactionKind from data-role when no role", () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["click"] })
    installed = installClickListener(manager)

    document.body.innerHTML = `
      <div class="free-tile-component" id="GRPH1">
        <div data-testid="drag-rect" data-role="axis-drag-rect"></div>
      </div>`
    document.querySelector("[data-testid='drag-rect']")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }))

    const click = delivered.find(d => d.eventType === "click")
    expect(click?.target?.interactionKind).toBe("axis-drag-rect")
  })

  it("uninstall invalidates a pending keyboard suppression so a later install's click fires", () => {
    // Keydown on install A adds a suppress entry for the element. If that entry
    // leaked into install B, B would incorrectly suppress the first real click.
    const { manager: managerA, delivered: deliveredA } = makeManagerWithCapture()
    managerA.register("plugin-A", { eventTypes: ["click"] })
    installed = installClickListener(managerA)

    document.body.innerHTML = `<div class="menu-bar"><button data-testid="x">OK</button></div>`
    const el = document.querySelector("button")!
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    // Unsubscribe before the synthesized click arrives
    installed.uninstall()
    installed = undefined
    expect(deliveredA.filter(d => d.eventType === "click")).toHaveLength(1)

    // Fresh re-subscribe: the stale suppress entry must NOT suppress this click
    const { manager: managerB, delivered: deliveredB } = makeManagerWithCapture()
    managerB.register("plugin-B", { eventTypes: ["click"] })
    installed = installClickListener(managerB)
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    expect(deliveredB.filter(d => d.eventType === "click")).toHaveLength(1)
  })

  it("dblclick fires independent of click", () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["dblclick"] })
    installed = installClickListener(manager)

    document.body.innerHTML = `
      <div class="menu-bar"><button data-testid="x">OK</button></div>`
    document.querySelector("button")!
      .dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))

    const dbl = delivered.find(d => d.eventType === "dblclick")
    expect(dbl).toBeTruthy()
  })
})
