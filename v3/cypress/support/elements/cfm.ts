export const CfmElements = {
  openLocalDoc(filename) {
    cy.get('#app').selectFile(filename, { action: 'drag-drop' })
  }
}
