// The global beforeEach hook in cypress/support/e2e.ts intercepts the banner
// JSON URL with a 404 so the banner doesn't interfere with unrelated specs.
// Tests in this file override that intercept with a real config to exercise
// the banner's actual rendering and lifecycle in a real browser.

const stubConfig = {
  message: "Welcome to CODAP!",
  id: "test-announcement-banner",
  buttonText: "Feedback",
  buttonUrl: "https://example.com/feedback",
  buttonTarget: "_blank",
  enabled: true
}

context("AnnouncementBanner", () => {
  it("renders the banner and persists dismissal across page reloads", () => {
    cy.intercept("GET", "**/notifications/v3-announcement-banner.json", {
      statusCode: 200,
      body: stubConfig
    })
    cy.clearLocalStorage()

    const url = `${Cypress.config("index")}?noEntryModal&suppressUnsavedWarning`
    cy.visit(url)

    // Banner renders with the stubbed message.
    cy.get("[data-testid=announcement-banner]")
      .should("be.visible")
      .and("contain.text", stubConfig.message)

    // Feedback button uses the configured URL.
    cy.get("[data-testid=announcement-banner-button]")
      .should("have.attr", "href", stubConfig.buttonUrl)

    // Layout-shift class lands on the document root while the banner is visible.
    cy.get("html").should("have.class", "has-announcement-banner")

    // "Don't show again" hides the banner and persists the dismissal.
    cy.get("[data-testid=announcement-banner-dont-show]").click()
    cy.get("[data-testid=announcement-banner]").should("not.exist")
    cy.get("html").should("not.have.class", "has-announcement-banner")

    // Reload — banner should stay hidden via localStorage.
    cy.reload()
    cy.get("[data-testid=announcement-banner]").should("not.exist")
    cy.get("html").should("not.have.class", "has-announcement-banner")
  })

  it("does not render when the interactiveApi URL param is present", () => {
    // No intercept override needed: even if the fetch succeeded, the
    // <If condition={uiState.shouldRenderAnnouncementBanner}> gate prevents
    // the component from mounting in this mode, so the fetch never happens.
    cy.intercept("GET", "**/notifications/v3-announcement-banner.json", {
      statusCode: 200,
      body: stubConfig
    })

    const url = `${Cypress.config("index")}?interactiveApi=true&noEntryModal`
    cy.visit(url)
    cy.wait(500)

    cy.get("[data-testid=announcement-banner]").should("not.exist")
    cy.get("html").should("not.have.class", "has-announcement-banner")
  })
})
