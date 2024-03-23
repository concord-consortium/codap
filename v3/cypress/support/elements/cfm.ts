export const CfmElements = {
  openLocalDoc(filename: string) {
    cy.get('#codap-app-id').selectFile(filename, { action: 'drag-drop' })
  },
  getMenuBar() {
    return cy.get('#codap-menu-bar-id')
  },
  getHamburgerMenuButton() {
    return cy.get('#codap-menu-bar-id .cfm-menu.menu-anchor')
  },
  getHamburgerMenu() {
    return cy.get('#codap-menu-bar-id .cfm-menu.menu-showing')
  },
  getModalDialog() {
    return cy.get('#codap-menu-bar-id .view .modal-dialog')
  },
  openExampleDocument(filename: string) {
    this.getHamburgerMenuButton().click()
    this.getHamburgerMenu().find("li").contains("Open...").click()
    this.getModalDialog().find(".selectable").contains(filename).click()
    this.getModalDialog().find("button").contains("Open").click()
  }
}
