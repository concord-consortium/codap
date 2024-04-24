export const WebViewTileElements = {
  getUrlModal() {
    return cy.get(`.chakra-modal__content`)
  },
  enterUrl(url: string) {
    cy.get(`[data-testid=web-view-url-input]`).type(url)
    cy.get(`[data-testid=OK-button]`).click()
  },
  getIFrame() {
    // These functions were stolen from v2's commands.js
    const getIframeDocument = (selector, position) => {
      return cy.get(selector).eq(position).get("iframe")
      // Cypress yields jQuery element, which has the real
      // DOM element under property "0".
      // From the real DOM iframe element we can get
      // the "document" element, it is stored in "contentDocument" property
      // Cypress "its" command can access deep properties using dot notation
      // https://on.cypress.io/its
      .its(`${position}.contentDocument`).should('exist')
    }
    
    const getIframeBody = (selector, position=0) => {
      // get the document
      return getIframeDocument(selector, position)
      // automatically retries until body is loaded
      .its('body').should('not.be.undefined')
      // wraps "body" DOM element to allow
      // chaining more Cypress commands, like ".find(...)"
      .then(cy.wrap)
    }
    return getIframeBody(`.codap-web-view-iframe`)
  },
  getEditUrlButton() {
    return cy.get(`[data-testid=web-view-edit-url-button]`)
  },
  getTitle() {
    return cy.get(`.codap-web-view .title-bar .title-text`)
  },

  // Data Interactive API Tester Functions
  // These will only work if you've opened the API Tester plugin, which can be found here:
  // https://concord-consortium.github.io/codap-data-interactives/DataInteractiveAPITester/index.html?lang=en
  sendAPITesterCommand(command: string, oldCommand?: string) {
    // Delete the old command if it's provided
    if (oldCommand) {
      const deleteCommand = oldCommand.split("").reduce(cmd => `${cmd}{backspace}`, "")
      WebViewTileElements.getIFrame().find(`.di-message-area`).type(deleteCommand)
    }
    WebViewTileElements.getIFrame().find(`.di-message-area`).type(command)
    WebViewTileElements.getIFrame().find(`.di-send-button`).click()
  },
  getAPITesterResponse() {
    return WebViewTileElements.getIFrame().find(`.di-log-message`)
  },
  confirmAPITesterResponseContains(response: string | RegExp) {
    WebViewTileElements.getAPITesterResponse().contains(response).should("exist")
  },
  toggleAPITesterFilter() {
    WebViewTileElements.getIFrame().find(`#filter-button`).click()
  },
  clearAPITesterResponses() {
    WebViewTileElements.getIFrame().find(`#clear-log-button`).click()
  }

}
