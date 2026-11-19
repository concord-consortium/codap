/**
 * Regression-parity suite for uiNotificationMonitor: UI scenarios run with a broad monitor
 * subscribed must leave CODAP's own UI as they found it (see withBroadMonitor).
 */

import { visitWithTestPlugin } from "../support/helpers/test-plugin"
import { withBroadMonitor } from "../support/with-monitor"

describe("uiNotificationMonitor — regression parity", () => {
  beforeEach(() => {
    visitWithTestPlugin()
  })

  it("File menu open/close with broad monitor", () => {
    withBroadMonitor(() => {
      cy.get(".menu-bar-left .file-menu-button").click()
      cy.get(".menu-list-container").should("be.visible")
      cy.get("body").type("{esc}")
      cy.get(".menu-list-container").should("not.exist")
    })
  })

  it("Tables tool-shelf menu open/close with broad monitor", () => {
    withBroadMonitor(() => {
      cy.get('[data-testid="tool-shelf-button-table"]').click()
      cy.get('[data-testid="tool-shelf-table-menu-list"]').should("be.visible")
      cy.get("body").type("{esc}")
      cy.get('[data-testid="tool-shelf-table-menu-list"]').should("not.be.visible")
    })
  })
})
