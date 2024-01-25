export const ToolbarElements = {
  getToolshelfSelector(component) {
    let el = ""
    switch (component) {
      case "graph":
        el = "[data-testid=tool-shelf-button-Graph]"
        break
      case "slider":
        el = "[data-testid=tool-shelf-button-Slider]"
        break
      case "calculator":
        el = "[data-testid=tool-shelf-button-Calc]"
        break
      case "table":
        el = "[data-testid=tool-shelf-button-table]"
        break
      case "map":
        el = "[data-testid=tool-shelf-button-Map]"
        break
    }
    return cy.get(el)
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
    return cy.get(`[data-testid="Delete Data Set-button"]`)
  }
}
