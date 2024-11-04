interface IDocumentOptions {
  discardChanges?: boolean
}
export const CfmElements = {
  openLocalDoc(filename: string) {
    cy.get('#codap-app-id').selectFile(filename, { action: 'drag-drop' })
  },
  closeDocument(options?: IDocumentOptions) {
    this.getHamburgerMenuButton().click()
    this.getHamburgerMenu().contains("li", "Close").click()
    if (options?.discardChanges) {
      this.discardDocumentChanges()
    }
  },
  getMenuBar() {
    return cy.get('#codap-menu-bar-id')
  },
  getHamburgerMenuButton() {
    return cy.get('#codap-menu-bar-id .menu-bar-left .cfm-menu.menu-anchor')
  },
  getHamburgerMenu() {
    return cy.get('#codap-menu-bar-id .cfm-menu.menu-showing')
  },
  getLanguageMenuButton() {
    return cy.get('#codap-menu-bar-id .menu-bar-right .cfm-menu.menu-anchor')
  },
  getLanguageMenu() {
    return cy.get('#codap-menu-bar-id .cfm-menu.menu-showing')
  },
  getModalDialog() {
    return cy.get('#codap-menu-bar-id .view .modal-dialog')
  },
  discardDocumentChanges() {
    this.getModalDialog().contains("Are you sure")
    this.getModalDialog().find('button').contains("Yes").click()
  },
  openExampleDocument(filename: string, options?: IDocumentOptions) {
    this.getHamburgerMenuButton().click()
    this.getHamburgerMenu().find("li").contains("Open...").click()
    if (options?.discardChanges) {
      this.discardDocumentChanges()
    }
    this.getModalDialog().find(".selectable").contains(filename).eq(0).click()
    this.getModalDialog().find("button").contains("Open").click()
  },
  openLocalFile(filename: string) {
    this.getHamburgerMenuButton().click()
    this.getHamburgerMenu().find("li").contains("Open...").click()
    this.getModalDialog().find(".selectable").contains(filename).eq(1).click()
  }
}
