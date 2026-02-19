import { ComponentElements as c } from "./component-elements"

// Selector for real case card views, excluding dummy views used for animations
const kCardView = '.case-card-view:not(.dummy)'
// Use > direct child combinators to scope to each view's own header/content,
// preventing descendant selectors from crossing into nested child views.
const kHeader = `${kCardView} > .case-card-view-header`
const kAttrsWrap = `${kCardView} > .case-card-attributes > .case-card-attrs-wrapper`

export const CardTileElements = {
  getCardTile(index = 0) {
    return c.getComponentTile("case-card", index)
  },
  // Gets the real case views, ignoring the dummy views used for animations
  getCaseCardView() {
    return cy.get(kCardView)
  },
  getViewTitle() {
    return cy.get(`${kHeader} [data-testid="case-card-view-title"]`)
  },
  getPreviousButton() {
    return cy.get(`${kHeader} [data-testid="case-card-view-previous-button"]`)
  },
  getNextButton() {
    return cy.get(`${kHeader} [data-testid="case-card-view-next-button"]`)
  },
  getIndexText() {
    return cy.get(`${kHeader} [data-testid="case-card-view-index"]`)
  },
  getAttributes() {
    return cy.get(`${kAttrsWrap} [data-testid="case-card-attr"]`)
  },
  getAttrs() {
    return cy.get(`${kAttrsWrap} [data-testid="case-card-attrs"]`)
  },
  getAttributeNames() {
    return cy.get(`${kAttrsWrap} [data-testid="case-card-attr-name"]`)
  },
  openAttributeMenu(index=0) {
    this.getAttributeNames().eq(index).find("button").click()
  },
  getAttributeNameInput() {
    return cy.get(`${kAttrsWrap} [data-testid="column-name-input"]:visible`)
  },
  getAttributeValues() {
    return cy.get(`${kAttrsWrap} [data-testid="case-card-attr-value"]`)
  },
  getAttributeValueEditors() {
    return cy.get(`${kAttrsWrap} [data-testid="case-card-attr-value-text-editor"]:visible`)
  },
  getAddAttributeButton() {
    return cy.get(`${kCardView} > .case-card-attributes > [data-testid="add-attribute-button"]`)
  },
  getSummaryButton() {
    return cy.get('[data-testid="summary-view-toggle-button"]')
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
