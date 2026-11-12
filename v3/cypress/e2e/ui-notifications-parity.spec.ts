/**
 * Regression-parity suite for uiNotificationMonitor. Runs UI scenarios with a broad
 * monitor subscribed and checks that CODAP's own UI ends in the same state as it
 * started, by comparing a signature of the app's DOM before and after:
 *   1. File menu open/close
 *   2. Tables tool-shelf menu open/close
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
