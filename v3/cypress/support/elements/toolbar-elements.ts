export const ToolbarElements = {
  getToolShelfSelector(component: string) {
    return cy.get(`[data-testid="tool-shelf-button-${component}"]`)
  },
  getToolShelfIcon(component: string) {
    return this.getToolShelfSelector(component)
  },
  getPluginCategory() {
    return cy.get(`.plugin-category-item`)
  },
  getPluginSubMenu() {
    return cy.get(`.plugin-sub-menu`)
  },
  getPluginSelection() {
    return cy.get(`.plugin-selection`)
  },
  getNewCaseTable() {
    return cy.get("[data-testid=tool-shelf-table-new]")
  },
  getNewCaseTableFromClipboard() {
    return cy.get("[data-testid=tool-shelf-table-new]")
  },
  getDatasetListedInToolShelf(dataset: string) {
    return cy.get(`[data-testid="tool-shelf-table-${dataset}"]`)
  },
  getDeleteCaseTable(dataset: string) {
    return cy.get(`[data-testid="tool-shelf-table-${dataset}"] .tool-shelf-menu-trash-icon`)
  },
  getConfirmDeleteDatasetModal() {
    return cy.get(`[data-testid=delete-data-set-button-delete]`)
  },
  getTilesButton() {
    return cy.get(`[data-testid=tool-shelf-button-tiles]`)
  },
  getTilesListMenu() {
    return cy.get(`[data-testid=tiles-list-menu]`)
  },
  getTilesListMenuItem() {
    return cy.get(`[data-testid=tiles-list-menu-item]`)
  },
  getTilesListMenuIcon() {
    return cy.get(`[data-testid=tile-list-menu-icon]`)
  },
  getOptionsButton() {
    return cy.get(`[data-testid=tool-shelf-button-options]`)
  },
  getWebViewButton() {
    return cy.get(`[data-testid=tool-shelf-button-web-view]`)
  },
  getUndoTool() {
    return cy.get('[data-testid="tool-shelf-button-undo"]')
 },
 getRedoTool() {
    return cy.get('[data-testid="tool-shelf-button-redo"]')
 },
}
