export const CfmElements = {
  openLocalDoc(filename) {
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
  }
}
