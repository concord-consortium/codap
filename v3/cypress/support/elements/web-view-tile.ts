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
  }
}
