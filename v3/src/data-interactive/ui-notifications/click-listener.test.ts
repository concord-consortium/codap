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
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }))

    const click = delivered.find(d => d.eventType === "click") as UiClickNotice | undefined
    expect(click?.eventType).toBe("click")
    expect(click?.target?.testId).toBe("x")
    expect(click?.target?.tag).toBe("BUTTON")
    expect(click?.via).toBe("pointer")
  })

  it("emits click with via:'keyboard' for a click with detail 0", () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["click"] })
    installed = installClickListener(manager)

    document.body.innerHTML = `<div class="menu-bar"><button data-testid="x">OK</button></div>`
    // the browser (or a library calling element.click()) dispatches a keyboard activation with detail 0
    document.querySelector("button")!.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 }))

    const clicks = delivered.filter(d => d.eventType === "click") as UiClickNotice[]
    expect(clicks).toHaveLength(1)
    expect(clicks[0].via).toBe("keyboard")
  })

  it("emits a single notice when a keydown is followed by its synthesized click", () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["click"] })
    installed = installClickListener(manager)

    document.body.innerHTML = `<div class="menu-bar"><button data-testid="x">OK</button></div>`
    const el = document.querySelector("button")!
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 }))

    expect(delivered.filter(d => d.eventType === "click")).toHaveLength(1)
  })

  it.each([
    ["a button", `<button data-testid="x">OK</button>`, "Enter"],
    ["a text input", `<input data-testid="x" type="text">`, " "],
    ["a textarea", `<textarea data-testid="x"></textarea>`, "Enter"],
    ["a contenteditable element", `<div data-testid="x" contenteditable="true">Some text</div>`, " "]
  ])("emits nothing for a keydown alone on %s", (_desc, html, key) => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["click"] })
    installed = installClickListener(manager)

    document.body.innerHTML = `<div class="menu-bar">${html}</div>`
    document.querySelector('[data-testid="x"]')!
      .dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }))

    expect(delivered.filter(d => d.eventType === "click")).toHaveLength(0)
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

  it("describes the owning control when its icon is clicked", () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["click", "dblclick"] })
    installed = installClickListener(manager)

    document.body.innerHTML = `
      <div class="tool-shelf">
        <button data-testid="tool-shelf-button-undo" aria-label="Undo" aria-disabled="true">
          <svg><path d="M0 0"></path></svg>
        </button>
      </div>`
    const path = document.querySelector("path")!
    path.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    path.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))

    const click = delivered.find(d => d.eventType === "click")
    const dblclick = delivered.find(d => d.eventType === "dblclick")
    for (const notice of [click, dblclick]) {
      expect(notice?.target?.testId).toBe("tool-shelf-button-undo")
      expect(notice?.target?.label).toBe("Undo")
      expect(notice?.target?.disabled).toBe(true)
    }
  })

  it("reports the control's testid when its icon has a testid of its own", () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["click", "dblclick"] })
    installed = installClickListener(manager)

    document.body.innerHTML = `
      <div class="tool-shelf">
        <div role="menuitem" data-testid="tool-shelf-tiles-menu-item-0">
          <svg data-testid="tool-shelf-tiles-menu-icon"><path d="M0 0"></path></svg>
          <span>Table</span>
        </div>
      </div>`
    const icon = document.querySelector("svg")!
    icon.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    icon.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))

    const notices = delivered.filter(d => d.eventType === "click" || d.eventType === "dblclick")
    expect(notices.length).toBe(2)
    for (const notice of notices) {
      expect(notice.target?.testId).toBe("tool-shelf-tiles-menu-item-0")
      expect(notice.target?.tag).toBe("DIV")
      expect(notice.target?.label).toBe("Table")
    }
  })

  it("takes the label of a widget-role control, not of a surrounding dialog", () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["click"] })
    installed = installClickListener(manager)

    document.body.innerHTML = `
      <div role="dialog" aria-label="Settings">
        <div role="menuitem" data-testid="item"><span>Rename</span></div>
        <p data-testid="text">Some text here</p>
      </div>`
    document.querySelector("span")!.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    document.querySelector("p")!.dispatchEvent(new MouseEvent("click", { bubbles: true }))

    const clicks = delivered.filter(d => d.eventType === "click")
    expect(clicks.length).toBe(2)
    expect(clicks[0].target?.label).toBe("Rename")
    expect(clicks[0].target?.interactionKind).toBe("menuitem")
    expect(clicks[1].target?.label).toBe("Some text here")
    expect(clicks[1].target?.interactionKind).toBeUndefined()
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
