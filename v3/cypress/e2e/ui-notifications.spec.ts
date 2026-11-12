/**
 * End-to-end tests for the uiNotificationMonitor API. Doubles as the
 * canonical plugin-developer example for this API.
 *
 * The test fixture at cypress/fixtures/test-plugin.html runs inside an
 * iframe-phone plugin loaded via ?di=<url>, exposing, among others:
 *   - subscribeMonitor(filter)
 *   - updateMonitor(id, filter)
 *   - unsubscribeMonitor(id)
 *   - getDeliveredNotices()
 *   - resetDeliveredNotices()
 */

import { testPluginWindow, visitWithTestPlugin } from "../support/helpers/test-plugin"

function subscribe(filter: unknown) {
  return testPluginWindow().then(async (w: any) => {
    const reply = await w.subscribeMonitor(filter)
    expect(reply?.success, "subscribeMonitor succeeded").to.equal(true)
  })
}

describe("uiNotificationMonitor — end-to-end", () => {
  beforeEach(() => {
    visitWithTestPlugin()
  })

  it("opening the File menu produces appear (region: header)", () => {
    subscribe({ eventTypes: ["appear"], targets: ["cfm-menu-file"] })
    cy.get(".menu-bar-left .file-menu-button").click()
    testPluginWindow().should((w: any) => {
      const appear = w.getDeliveredNotices().find((n: any) =>
        n.eventType === "appear" && n.target?.testId === "cfm-menu-file")
      expect(appear, "appear for File menu").to.not.equal(undefined)
      expect(appear.region).to.equal("header")
    })
  })

  it("clicking a tool-shelf button fires click (region: header)", () => {
    subscribe({ eventTypes: ["click"] })
    cy.get('[data-testid="tool-shelf-button-table"]').click()
    testPluginWindow().should((w: any) => {
      const click = w.getDeliveredNotices().find((n: any) =>
        n.eventType === "click" && n.target?.testId === "tool-shelf-button-table")
      expect(click, "click for Tables button").to.not.equal(undefined)
      expect(click.region).to.equal("header")
      expect(click.via).to.equal("pointer")
    })
  })
})
