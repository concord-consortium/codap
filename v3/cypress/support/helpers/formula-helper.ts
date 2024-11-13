import { CfmElements as cfm } from "../elements/cfm"

const isMac = navigator.platform.toLowerCase().includes("mac")
const metaCtrlKey = isMac ? "Meta" : "Control"

export const FormulaHelper = {
  visitURL(queryParams = "") {
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(1000)
  },
  importFile(file: string) {
    cfm.openLocalDoc(file)
    cy.wait(1000)
  },
  // addNewAttribute(collectionIndex = 1) {
  //   table.addNewAttribute(collectionIndex)
  // },
  // renameAttribute(currentAttributeName: string, newAttributeName: string, collectionIndex = 1) {
  //   table.renameAttribute(currentAttributeName, newAttributeName, collectionIndex)
  // },
  // deleteAttribute(attributeName: string, collectionIndex = 1) {
  //   table.deleteAttribute(attributeName, collectionIndex)
  // },
  // addFormula(attributeName: string, formula: string, collectionIndex = 1) {
  //   table.addFormula(attributeName, formula, collectionIndex)
  // },
  // verifyValues(attributeName: string, values: Array<any>, collectionIndex = 1) {
  //   table.verifyFormulaValues(attributeName, values, collectionIndex)
  // },
  // checkFormulaExists(attributeName: string, formula: string, collectionIndex = 1) {
  //   table.checkFormulaExists(attributeName, formula, collectionIndex)
  // },
  // editFormula(attributeName: string, formula: string, collectionIndex = 1) {
  //   table.editFormula(attributeName, formula, collectionIndex)
  // },
  // createNewDataset() {
  //   table.createNewTableFromToolShelf()
  // },
  // insertCases(rowIndex: number, numOfCases: number) {
  //   table.openIndexMenuForRow(rowIndex)
  //   table.insertCases(numOfCases, "after")
  // },
  // changeSliderVariableName(sliderVariableName: string) {
  //   slider.changeVariableName(sliderVariableName)
  // },
  // changeSliderValue(sliderValue: string) {
  //   slider.changeVariableValue(sliderValue)
  // },
  // addSlider() {
  //   c.getIconFromToolShelf("slider").click()
  // },
  // deleteSlider() {
  //   c.closeComponent("slider")
  // },
  clearFormulaInput() {
    cy.get("[data-testid=formula-editor-input] .cm-content").should("be.visible").and("have.focus")
    cy.get("[data-testid=formula-editor-input] .cm-content").realPress([metaCtrlKey, "A"])
    cy.get("[data-testid=formula-editor-input] .cm-content").realType("{del}")
  },
  addFilterFormula(formula: string) {
    cy.get(".formula-modal-body [data-testid=formula-editor-input] .cm-content").click()
    cy.get(".formula-modal-body [data-testid=formula-editor-input] .cm-focused").realType(formula)
  }
}
