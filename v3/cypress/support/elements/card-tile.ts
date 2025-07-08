import { ComponentElements as c } from "./component-elements"

export const CardTileElements = {
  getCardTile(index = 0) {
    return c.getComponentTile("case-card", index)
  },
  getIndexText() {
    return cy.get('[data-testid="case-card-view-index"]')
  },
  getAttributes() {
    return cy.get('[data-testid="case-card-attr"]')
  },
  getAttributeNames() {
    return cy.get('[data-testid="case-card-attr-name"]')
  },
  getAttributeValues() {
    return cy.get('[data-testid="case-card-attr-value"]')
  },
  getAttributeValueEditors() {
    return cy.get('[data-testid="case-card-attr-value"] [data-testid="case-card-attr-value-text-editor"]')
  },
  getAddAttributeButton() {
    return cy.get('[data-testid="add-attribute-button"]')
  },
  getInspectorPanel() {
    return cy.get('[data-testid="codap-case-card"]').siblings('[data-testid="inspector-panel"]')
  },
  getDeleteCasesButton() {
    return this.getInspectorPanel().find('[data-testid="delete-cases-button"]')
  },
  getTrashMenu() {
    return cy.get('[data-testid="trash-menu-list"]')
  },
  getSelectAllCasesButton() {
    return cy.get('[data-testid="trash-menu-select-all-cases"]')
  },
  getDeleteSelectedCasesButton() {
    return cy.get('[data-testid="trash-menu-delete-selected-cases"]')
  },
  getDeleteUnselectedCasesButton() {
    return cy.get('[data-testid="trash-menu-delete-unselected-cases"]')
  },
  getDeleteAllCasesButton() {
    return cy.get('[data-testid="trash-menu-delete-all-cases"]')
  },
  getHideShowButton() {
    return this.getInspectorPanel().find('[data-testid="hide-show-button"]')
  },
  getHideShowMenu() {
    return cy.get('[data-testid="hide-show-menu-list"]')
  },
  getSetAsideSelectedCasesButton() {
    return cy.get('[data-testid="hide-show-menu-set-aside-selected-cases"]')
  },
  getSetAsideUnselectedCasesButton() {
    return cy.get('[data-testid="hide-show-menu-set-aside-unselected-cases"]')
  },
  getRestoreSetAsideCasesButton() {
    return cy.get('[data-testid="hide-show-menu-restore-set-aside-cases"]')
  },
  getShowAllHiddenAttributesButton() {
    return cy.get('[data-testid="hide-show-menu-show-all-hidden-attributes"]')
  },
  getAddFilterFormulaButton() {
    return cy.get('[data-testid="hide-show-menu-add-filter-formula"]')
  },
  getRulerButton() {
    return this.getInspectorPanel().find('[data-testid="ruler-button"]')
  },
  getRulerMenu() {
    return cy.get('[data-testid="ruler-menu-list"]')
  },
  getRulerAddAttributeButton() {
    return cy.get('[data-testid="ruler-menu-new-attribute"]')
  }
}
