interface IDocumentOptions {
  discardChanges?: boolean
}
export const CfmElements = {
  openLocalDoc(filename: string) {
    cy.get('#codap-app-id').selectFile(filename, { action: 'drag-drop' })
    cy.wait(1000) // Wait for the document to load
  },
  openLocalDocWithUserEntry(filename: string) {
    cy.get('#user-entry-drop-overlay').selectFile(filename, { action: 'drag-drop' })
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
  getHelpMenuButton() {
    return cy.get('#codap-menu-bar-id .menu-bar-right .help-menu .cfm-menu.menu-anchor')
  },
  getHelpMenu() {
    return cy.get('#codap-menu-bar-id .menu-bar-right .help-menu .cfm-menu.menu-showing')
  },
  getHelpMenuItem(index: number) {
    return cy.get(`.menu.help-menu.menu-open .menuItem`).eq(index)
  },
  getLanguageMenuButton() {
    return cy.get('#codap-menu-bar-id .menu-bar-right .lang-menu .cfm-menu.menu-anchor')
  },
  getLanguageMenu() {
    return cy.get('#codap-menu-bar-id .menu-bar-right .lang-menu .cfm-menu.menu-showing')
  },
  getSettingsMenuButton() {
    return cy.get('#codap-menu-bar-id .menu-bar-right .settings-menu .menu-bar-button')
  },
  getSettingsMenu() {
    return cy.get('#codap-menu-bar-id .menu-bar-right .settings-menu .cfm-menu')
  },
  getSettingsMenuItems() {
    return this.getSettingsMenu().find(".menuItem")
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
