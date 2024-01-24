export const CfmElements = {
  openLocalDoc(filename) {
    cy.get('#codap-app-id').selectFile(filename, { action: 'drag-drop' })
  }
}
