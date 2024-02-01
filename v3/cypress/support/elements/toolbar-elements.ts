export const ToolbarElements = {
  getToolshelfSelector(component) {
    return cy.get(`[data-testid=tool-shelf-button-${component}]`)
  },
  getToolShelfIcon(component) {
    return this.getToolshelfSelector(component)
  },
  getNewCaseTable() {
    return cy.get("[data-testid=tool-shelf-table-new]")
  },
  getNewCaseTableFromClipboard() {
    return cy.get("[data-testid=tool-shelf-table-new]")
  },
  getDatasetListedInToolshelf(dataset) {
    return cy.get(`[data-testid="tool-shelf-table-${dataset}"]`)
  },
  getDeleteCaseTable(dataset) {
    return cy.get(`[data-testid="tool-shelf-table-${dataset}"] .tool-shelf-menu-trash-icon`)
  },
  getConfirmDeleteDatasetModal() {
    return cy.get(`[data-testid=delete-data-set-button-delete]`)
  },
  getUndoTool() {
    return cy.get('[data-testid="tool-shelf-button-undo"]')
 },
 getRedoTool() {
    return cy.get('[data-testid="tool-shelf-button-redo]')
 }
}
