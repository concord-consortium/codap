import { CfmElements as cfm } from "./cfm"

export const ToolbarElements = {
  confirmToolbarPosition(position: "Top" | "Left" = "Top") {
    if (position === "Top") {
      cy.get(".toolbar-container:not(.vertical-toolbar-container)").should("exist")
      cy.get(".vertical-toolbar-container").should("not.exist")
      cfm.getSettingsMenuButton().click()
      cfm.getSettingsMenuItems().eq(0).should("contain.text", "Toolbar Position: Left")
      cfm.getMenuBarInfo().click() // Close the menu
    } else {
      cy.get(".toolbar-container:not(.vertical-toolbar-container)").should("not.exist")
      cy.get(".vertical-toolbar-container").should("exist")
      cfm.getSettingsMenuButton().click()
      cfm.getSettingsMenuItems().eq(0).should("contain.text", "Toolbar Position: Top")
      cfm.getMenuBarInfo().click() // Close the menu
    }
  },
  getToolShelfSelector(component: string) {
    return cy.get(`[data-testid="tool-shelf-button-${component}"]`)
  },
  getToolShelfIcon(component: string) {
    return this.getToolShelfSelector(component)
  },
  getPluginGroup() {
    return cy.get(`.plugin-group-menu-item`)
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
    return cy.get("[data-testid=tool-shelf-table-new-clipboard]")
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
