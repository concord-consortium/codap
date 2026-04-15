import { installDomObserver } from "./dom-observer"
import { UiNotificationMonitorManager } from "./ui-notification-monitor-manager"
import { UiNotice } from "./ui-notification-types"

function awaitMutations(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 10))
}

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

describe("dom-observer", () => {
  let installed: { uninstall: () => void } | undefined

  beforeEach(() => {
    document.body.innerHTML = ""
  })

  afterEach(() => {
    installed?.uninstall()
    installed = undefined
    document.body.innerHTML = ""
  })

  it("emits appear for a CFM dialog container added as a subtree root", async () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["appear"] })
    installed = installDomObserver(manager)

    const wrap = document.createElement("div")
    wrap.className = "modal"
    wrap.innerHTML = `
      <div class="modal-content">
        <section class="modal-dialog-container" role="dialog" data-testid="cfm-dialog-share"></section>
      </div>`
    document.body.appendChild(wrap)

    await awaitMutations()
    const appears = delivered.filter(d => d.eventType === "appear")
    expect(appears.length).toBeGreaterThan(0)
    expect(appears.some(a =>
      a.eventType === "appear" && a.target?.testId === "cfm-dialog-share"
    )).toBe(true)
  })

  it("emits appear via aria-expanded trigger flip", async () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["appear", "disappear"] })

    // Create trigger BEFORE the observer starts to avoid childList event
    const trig = document.createElement("button")
    trig.setAttribute("aria-haspopup", "menu")
    trig.setAttribute("aria-expanded", "false")
    trig.setAttribute("data-testid", "file-menu-button")
    document.body.appendChild(trig)

    installed = installDomObserver(manager)

    // flip to true
    trig.setAttribute("aria-expanded", "true")
    await awaitMutations()
    const appears = delivered.filter(d => d.eventType === "appear")
    expect(appears.some(a =>
      a.eventType === "appear" && a.target?.testId === "file-menu-button"
    )).toBe(true)

    // flip back
    trig.setAttribute("aria-expanded", "false")
    await awaitMutations()
    const disappears = delivered.filter(d => d.eventType === "disappear")
    expect(disappears.some(d =>
      d.eventType === "disappear" && d.target?.testId === "file-menu-button"
    )).toBe(true)
  })

  it("rejects hidden subtree mutations", async () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["appear"] })

    const hidden = document.createElement("div")
    hidden.setAttribute("aria-hidden", "true")
    document.body.appendChild(hidden)

    installed = installDomObserver(manager)

    // Add a marker inside the hidden subtree
    const menu = document.createElement("div")
    menu.className = "chakra-menu__menu-list"
    menu.setAttribute("data-testid", "hidden-menu")
    hidden.appendChild(menu)
    await awaitMutations()

    expect(delivered.some(d => d.eventType === "appear" && d.target?.testId === "hidden-menu")).toBe(false)
  })

  it("sets target.disabled when menuitem is disabled", async () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["appear"] })

    installed = installDomObserver(manager)

    const menu = document.createElement("div")
    menu.className = "chakra-menu__menu-list"
    menu.innerHTML = `
      <div role="menuitem" aria-disabled="true" data-testid="disabled-mi"></div>
      <div role="menuitem" data-testid="enabled-mi"></div>
    `
    document.body.appendChild(menu)
    await awaitMutations()

    const dis = delivered.find(d => d.eventType === "appear" && d.target?.testId === "disabled-mi")
    const ena = delivered.find(d => d.eventType === "appear" && d.target?.testId === "enabled-mi")
    expect(dis?.target?.disabled).toBe(true)
    expect(ena?.target?.disabled).toBeUndefined()
  })

  it("sets target.interactionKind from role for menuitem", async () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["appear"] })

    installed = installDomObserver(manager)

    const mi = document.createElement("div")
    mi.setAttribute("role", "menuitem")
    mi.setAttribute("data-testid", "r-mi")
    document.body.appendChild(mi)
    await awaitMutations()

    const n = delivered.find(d => d.eventType === "appear" && d.target?.testId === "r-mi")
    expect(n?.target?.interactionKind).toBe("menuitem")
  })
})
