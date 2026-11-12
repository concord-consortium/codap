const kFixturePrefix = "/cypress-fixtures"

/** Visit CODAP with the test plugin loaded, and wait until CODAP has answered its first request. */
export function visitWithTestPlugin(params = "mouseSensor&noEntryModal&suppressUnsavedWarning") {
  cy.readFile("node_modules/iframe-phone/dist/iframe-phone.js").then(js => {
    cy.intercept({ method: "GET", pathname: `${kFixturePrefix}/iframe-phone.js` },
      { body: js, headers: { "content-type": "application/javascript" } })
  })
  // Match on pathname: CODAP reloads the plugin with ?lang=...&locale=... appended.
  cy.intercept({ method: "GET", pathname: `${kFixturePrefix}/test-plugin.html` },
    { fixture: "test-plugin.html", headers: { "content-type": "text/html" } })
  const pluginUrl = `${Cypress.config("baseUrl")}${kFixturePrefix}/test-plugin.html`
  cy.visit(`${Cypress.config("index")}?di=${pluginUrl}&${params}`)
  cy.get(".codap-web-view-iframe", { timeout: 30000 })
    .its("0.contentWindow.__codapReady", { timeout: 30000 }).should("equal", true)
}

/** The plugin iframe's window, looked up fresh each time (the iframe reloads once on startup). */
export function testPluginWindow(): Cypress.Chainable<any> {
  return cy.get(".codap-web-view-iframe").its("0.contentWindow")
}
