import { ComponentElements as c } from "../elements/component-elements"
import { TableTileElements as table } from "../elements/table-tile"
import { SliderTileElements as slider } from "../elements/slider-tile"
import { CfmElements as cfm } from "../elements/cfm"

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
  addNewAttribute(collectionIndex = 1) {
    table.addNewAttribute(collectionIndex)
  },
  renameAttribute(currentAttributeName: string, newAttributeName: string, collectionIndex = 1) {
    table.renameAttribute(currentAttributeName, newAttributeName, collectionIndex)
  },
  deleteAttribute(attributeName: string, collectionIndex = 1) {
    table.deleteAttribute(attributeName, collectionIndex)
  },
  addFormula(attributeName: string, formula: string, collectionIndex = 1) {
    table.addFormula(attributeName, formula, collectionIndex)
  },
  verifyValues(attributeName: string, values: object, collectionIndex = 1) {
    table.verifyFormulaValues(attributeName, values, collectionIndex)
  },
  checkFormulaExists(attributeName: string, formula: string, collectionIndex = 1) {
    table.checkFormulaExists(attributeName, formula, collectionIndex)
  },
  editFormula(attributeName: string, formula: string, collectionIndex = 1) {
    table.editFormula(attributeName, formula, collectionIndex)
  },
  createNewDataset() {
    table.createNewTableFromToolshelf()
  },
  insertCases(rowIndex: number, numOfCases: number) {
    table.openIndexMenuForRow(rowIndex)
    table.insertCases(numOfCases, "after")
  },
  changeSliderVariableName(sliderVariableName: string) {
    slider.changeVariableName(sliderVariableName)
  },
  changeSliderValue(sliderValue: string) {
    slider.changeVariableValue(sliderValue)
  },
  addSlider() {
    c.getIconFromToolshelf("slider").click()
  },
  deleteSlider() {
    c.closeComponent("slider")
  }
}
