interface IDocumentOptions {
  discardChanges?: boolean
}
export const CfmElements = {
  openLocalDoc(filename: string) {
    cy.get('#codap-app-id').selectFile(filename, { action: 'drag-drop' })
    if (/\.csv$/i.test(filename)) {
      // CSV files are imported by the Importer plugin, which loads remotely and finishes on its own
      // schedule. It creates and selects a case table, then removes its own (hidden) tile, which
      // leaves the case table selected. Either step would take the selection from a tile the test
      // has created in the meantime, so wait for both, allowing for a slow plugin load.
      cy.get(".codap-component[data-testid$=table]", { timeout: 20000 }).should("exist")
      cy.get(".codap-component[data-testid$=web-view]:contains('Importer')", { timeout: 20000 })
        .should("not.exist")
    } else {
      cy.wait(1000) // Wait for the document to load
    }
  },
  openLocalDocWithUserEntry(filename: string) {
    cy.get('#user-entry-drop-overlay').selectFile(filename, { action: 'drag-drop', force: true })
  },
  closeDocument(options?: IDocumentOptions) {
    this.getHamburgerMenuButton().click()
    this.getHamburgerMenu().contains(".menuItem", "Close").click()
    if (options?.discardChanges) {
      this.discardDocumentChanges()
    }
  },
  getMenuBar() {
    return cy.get('#codap-menu-bar-id')
  },
  getMenuBarInfo() {
    return cy.get('.menu-bar-info')
  },
  getHamburgerMenuButton() {
    return cy.get('#codap-menu-bar-id .menu-bar-left .cfm-menu.menu-anchor')
  },
  getHamburgerMenu() {
    return cy.get('.cfm-menu.menu-showing')
  },
  getHelpMenuButton() {
    return cy.get('#codap-menu-bar-id .menu-bar-right .help-menu .cfm-menu.menu-anchor')
  },
  getHelpMenu() {
    return cy.get('.cfm-menu.menu-showing')
  },
  getHelpMenuItem(index: number) {
    return cy.get(`.cfm-menu.menu-showing .menuItem`).eq(index)
  },
  getLanguageMenuButton() {
    return cy.get('#codap-menu-bar-id .menu-bar-right .lang-menu .cfm-menu.menu-anchor')
  },
  getLanguageMenu() {
    return cy.get('.cfm-menu.menu-showing')
  },
  getSettingsMenuButton() {
    return cy.get('#codap-menu-bar-id .menu-bar-right .settings-menu .menu-bar-button')
  },
  getSettingsMenu() {
    return cy.get('.cfm-menu.menu-showing')
  },
  getSettingsMenuItems() {
    return this.getSettingsMenu().find(".menuItem")
  },
  getModalDialog() {
    return cy.get('.modal-dialog')
  },
  discardDocumentChanges() {
    this.getModalDialog().contains("Are you sure")
    this.getModalDialog().find('button').contains("Yes").click()
  },
  openExampleDocument(filename: string, options?: IDocumentOptions) {
    this.getHamburgerMenuButton().click()
    this.getHamburgerMenu().contains(".menuItem", "Open...").click()
    if (options?.discardChanges) {
      this.discardDocumentChanges()
    }
    this.getModalDialog().find(".selectable").contains(filename).eq(0).click()
    this.getModalDialog().find("button").contains("Open").click()
  },
  openLocalFile(filename: string) {
    this.getHamburgerMenuButton().click()
    this.getHamburgerMenu().contains(".menuItem", "Open...").click()
    this.getModalDialog().find(".selectable").contains(filename).eq(1).click()
  }
}
