class CaseCardObject {
  getCaseCardTile() {
    return cy.get('.react-data-card-view')
  }
  getCaseCardCellSummaryValue() {
    return cy.get('.react-data-card-attribute-summary')
  }
  getTableIcon() {
    return cy.get('.dg-table-icon')
  }
  changeToTable() {
    cy.get('.dg-table-icon').click();
    cy.clickMenuItem('Switch to case table view of the data')
  }
  getCaseCardCollectionHeader(position = 0) {
    return cy.get('.collection-header-row').eq(position)
  }
  getCaseCardCollectionHeaderLabel(position = 0) {
    return cy.get('.collection-header-row').eq(position).find('.collection-label')
  }
  getCaseCardNavBackIcon() {
    return cy.get('.nav-buttons .moonicon-icon-reverse-play')
  }
  getCaseCardNavForwardIcon() {
    return cy.get('.nav-buttons .moonicon-icon-play')
  }
   getCaseCardDeselectButton() {
    return cy.get('.nav-buttons .dg-card-deselect')
  }
  getCaseCardAddCasePlusIcon() {
    return cy.get('.nav-header .dg-floating-button-right')
  }
  getCaseCardAddAttributePlusIcon() {
    return cy.get('.react-data-card-row .dg-floating-plus')
  }
  caseCardAttributeEl() {
    return ('.react-data-card-attribute')
  }
  getCaseCardAttribute() {
    return cy.get(this.caseCardAttributeEl())
  }
  getCaseCardAttributeSummary() {
    return cy.get('.react-data-card-attribute-summary')
  }
  getCaseCardAttributeMenuItem(item) {
    return cy.get('.react-data-card-attribute-menu-item').contains(item)
  }
  getCaseCardCell() {
    return cy.get('.react-data-card-value')
  }
  editCaseCardCell(text) {
    cy.get('.react-data-card-value-input').type(text)
  }
  caseCardAttributeInputEl() {
    return ('.react-data-card-attr-name-input')
  }
  openCaseCardAttributeMenu(attr){
    this.getCaseCardAttribute().contains(attr).click();
  }
  selectMenuItemFromCaseCardAttributeMenu(item){
    this.getCaseCardAttributeMenuItem(item).click();
  }
}
export default CaseCardObject