import { CfmElements as cfm } from "./cfm"

export const ToolbarElements = {
  confirmToolbarPosition(position: "Top" | "Left" = "Top") {
    if (position === "Top") {
      cy.get(".app-container:not(.vertical-toolbar)").should("exist")
      cy.get(".vertical-toolbar").should("not.exist")
      cfm.getSettingsMenuButton().click()
      cfm.getSettingsMenuItems().eq(0).should("contain.text", "Toolbar Position: Left")
      cy.get('body').type('{esc}') // Close the menu
      cfm.getSettingsMenu().should("not.exist")
    } else {
      cy.get(".app-container:not(.vertical-toolbar)").should("not.exist")
      cy.get(".vertical-toolbar").should("exist")
      cfm.getSettingsMenuButton().click()
      cfm.getSettingsMenuItems().eq(0).should("contain.text", "Toolbar Position: Top")
      cy.get('body').type('{esc}') // Close the menu
      cfm.getSettingsMenu().should("not.exist")
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
  getTilesListMenuItemLabel() {
    return this.getTilesListMenuItem().find('.tile-menu-item-label')
  },
  getTilesListMenuShortcutKey() {
    return this.getTilesListMenuItem().find('.tile-menu-shortcut-key')
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
