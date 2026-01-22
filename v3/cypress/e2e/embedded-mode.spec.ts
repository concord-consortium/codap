context("Embedded Mode", () => {
  beforeEach(() => {
    // Visit the embedded mode test harness
    cy.visit("/embedded-mode-harness.html")
  })

  // Helper to wait for CODAP to be connected via window state
  const waitForCodapConnection = () => {
    return cy.window({ timeout: 30000 }).should((win) => {
      assert.isTrue((win as any).harnessState?.codapPresent, "CODAP should be connected")
    })
  }

  // Helper to send a command and get the response via window
  const sendCommand = (command: object) => {
    return cy.window().then((win) => {
      return (win as any).sendTestCommand(command)
    })
  }

  describe("Parent-child communication", () => {
    it("should receive codap-present message when CODAP loads in embedded mode", () => {
      // Wait for the codap-present message to be received via DOM
      cy.get('[data-testid="codap-present-status"]', { timeout: 30000 })
        .should("contain.text", "codap-present received")

      // The indicator should show success
      cy.get('[data-testid="codap-present-indicator"]')
        .should("have.class", "success")

      // The send button should be enabled once connected
      cy.get('[data-testid="send-command-button"]')
        .should("not.be.disabled")

      // Also verify via window state
      cy.window().should((win) => {
        assert.isTrue((win as any).harnessState.codapPresent, "harnessState.codapPresent should be true")
      })
    })

    it("should handle get dataContextList request from parent", () => {
      // Wait for connection
      waitForCodapConnection()

      // Send command via window function
      sendCommand({ action: "get", resource: "dataContextList" }).then((response: any) => {
        expect(response).to.have.property("success", true)
      })
    })

    it("should handle get componentList request from parent", () => {
      // Wait for connection
      waitForCodapConnection()

      // Send command via window function
      sendCommand({ action: "get", resource: "componentList" }).then((response: any) => {
        expect(response).to.have.property("success", true)
      })
    })

    it("should handle create dataContext request from parent", () => {
      // Wait for connection
      waitForCodapConnection()

      // Create a data context
      sendCommand({
        action: "create",
        resource: "dataContext",
        values: {
          name: "TestData",
          collections: [{
            name: "Cases",
            attrs: [{ name: "x" }, { name: "y" }]
          }]
        }
      }).then((response: any) => {
        expect(response).to.have.property("success", true)
      })

      // Verify the data context was created
      sendCommand({ action: "get", resource: "dataContextList" }).then((response: any) => {
        expect(response).to.have.property("success", true)
        const names = response.values.map((v: any) => v.name)
        expect(names).to.include("TestData")
      })
    })

    it("should return error for interactiveFrame request (no associated tile)", () => {
      // Wait for connection
      waitForCodapConnection()

      // interactiveFrame is not valid for embedded server since there's no associated tile
      sendCommand({ action: "get", resource: "interactiveFrame" }).then((response: any) => {
        // This should fail because embedded server has no associated interactiveFrame
        expect(response).to.have.property("success", false)
      })
    })
  })

  describe("UI state in embedded mode", () => {
    it("should hide the menu bar and tool shelf when in embedded mode", () => {
      // Wait for CODAP to load
      waitForCodapConnection()

      // Access the iframe
      cy.get('[data-testid="codap-iframe"]')
        .its("0.contentDocument.body")
        .should("not.be.empty")
        .then(cy.wrap)
        .within(() => {
          // Menu bar should not be visible
          cy.get(".menu-bar").should("not.exist")

          // Tool shelf should not be visible
          cy.get(".tool-shelf").should("not.exist")
        })
    })

    it("should have transparent background in embedded mode", () => {
      // Wait for CODAP to load
      waitForCodapConnection()

      // Access the iframe and check for embedded-mode class
      cy.get('[data-testid="codap-iframe"]')
        .its("0.contentDocument.body")
        .should("not.be.empty")
        .then(cy.wrap)
        .within(() => {
          cy.get("#codap-app-id").should("have.class", "embedded-mode")
        })
    })
  })

  describe("Data manipulation via parent", () => {
    it("should create cases in a data context", () => {
      // Wait for connection
      waitForCodapConnection()

      // First create a data context
      sendCommand({
        action: "create",
        resource: "dataContext",
        values: {
          name: "TestData",
          collections: [{
            name: "Cases",
            attrs: [{ name: "x" }, { name: "y" }]
          }]
        }
      }).then((response: any) => {
        cy.log("Create dataContext response:", JSON.stringify(response))
        expect(response).to.have.property("success", true)
      })

      // Create some cases using item resource (more reliable)
      sendCommand({
        action: "create",
        resource: "dataContext[TestData].item",
        values: [{ x: 1, y: 2 }, { x: 3, y: 4 }]
      }).then((response: any) => {
        cy.log("Create items response:", JSON.stringify(response))
        expect(response).to.have.property("success", true)
      })

      // Verify the items were created
      sendCommand({
        action: "get",
        resource: "dataContext[TestData].itemCount"
      }).then((response: any) => {
        cy.log("Item count response:", JSON.stringify(response))
        expect(response).to.have.property("success", true)
        expect(response.values).to.equal(2)
      })
    })
  })
})
