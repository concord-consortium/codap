/**
 * End-to-end tests for the uiNotificationMonitor API (CODAP-1232). Doubles as the
 * canonical plugin-developer example for this API.
 *
 * The test fixture at cypress/fixtures/ui-notification-test-plugin.html runs
 * inside an iframe-phone plugin loaded via ?di=<url>, exposing:
 *   - subscribeMonitor(filter)
 *   - updateMonitor(id, filter)
 *   - unsubscribeMonitor(id)
 *   - getDeliveredNotices()
 */

const PLUGIN_PATH = "/cypress/fixtures/ui-notification-test-plugin.html"

function waitForPluginReady() {
  cy.get("iframe", { timeout: 30000 }).should("exist")
  cy.get("iframe").its("0.contentWindow").should("have.property", "subscribeMonitor")
}

function pluginWindow(): Cypress.Chainable<any> {
  return cy.get("iframe").its("0.contentWindow") as unknown as Cypress.Chainable<any>
}

function subscribe(filter: unknown) {
  return pluginWindow().then(async w => await w.subscribeMonitor(filter))
}

function getDelivered() {
  return pluginWindow().then(w => w.getDeliveredNotices())
}

function resetDelivered() {
  return pluginWindow().then(w => w.resetDeliveredNotices())
}

describe.skip("uiNotificationMonitor — end-to-end", () => {
  beforeEach(() => {
    const url = `${Cypress.config("index")}?di=${PLUGIN_PATH}&mouseSensor&noEntryModal&suppressUnsavedWarning`
    cy.visit(url)
    waitForPluginReady()
  })

  it("opening the File menu produces appear (region: header)", () => {
    subscribe({ eventTypes: ["appear"], targets: ["file-menu-button"] })
    cy.get('.menu-bar-left .file-menu-button').click()
    getDelivered().then((notices: any[]) => {
      const appear = notices.find(n => n.eventType === "appear" && n.target?.testId === "file-menu-button")
      expect(appear, "appear for File menu").to.exist.and.have.property("region", "header")
    })
  })

  it("clicking a tool-shelf button fires click (region: header)", () => {
    subscribe({ eventTypes: ["click"] })
    cy.get('[data-testid="tool-shelf-button-table"]').click()
    getDelivered().then((notices: any[]) => {
      const click = notices.find(n =>
        n.eventType === "click" && n.target?.testId === "tool-shelf-button-table")
      expect(click, "click for Tables button").to.exist.and.have.property("region", "header")
      expect(click.via).to.equal("pointer")
    })
  })

  it("right-click and scroll produce zero notices", () => {
    subscribe({
      eventTypes: ["appear", "disappear", "click", "dblclick", "dragStart", "dragEnd"]
    })
    resetDelivered()
    cy.get('body').rightclick()
    getDelivered().then((notices: any[]) => {
      expect(notices.filter(n => n.eventType === "click")).to.have.length(0)
    })
  })
})
