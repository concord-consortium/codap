import { ComponentElements as c } from "../elements/component-elements"
import { TableTileElements as table } from "../elements/table-tile"
import { SliderTileElements as slider } from "../elements/slider-tile"
import { CfmElements as cfm } from "../elements/cfm"

export const FormulaHelper = {
  stepExecutor(step) {
    cy.log(`Step: ${step.name}`)
    switch (step.name) {
      case "visitURL":
        this.visitURL(step)
        break
      case "importFile":
        this.importFile(step)
        break
      case "addNewAttribute":
        this.addNewAttribute(step)
        break
      case "renameAttribute":
        this.renameAttribute(step)
        break
      case "deleteAttribute":
        this.deleteAttribute(step)
        break
      case "addFormula":
        this.addFormula(step)
        break
      case "editFormula":
        this.editFormula(step)
        break
      case "verifyValues":
        this.verifyValues(step)
        break
      case "checkFormulaExists":
        this.checkFormulaExists(step)
        break
      case "createNewDataset":
        this.createNewDataset(step)
        break
      case "insertCases":
        this.insertCases(step)
        break
      case "changeSliderVariableName":
        this.changeSliderVariableName(step)
        break
      case "changeSliderValue":
        this.changeSliderValue(step)
        break
      case "deleteSlider":
        this.deleteSlider(step)
        break
    }
  },
  visitURL(step) {
    const queryParams = step.queryParams || ""
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(1000)
  },
  importFile(step) {
    cfm.openLocalDoc(step.file)
    cy.wait(1000)
  },
  addNewAttribute(step) {
    table.addNewAttribute(step.collectionIndex || 1)
  },
  renameAttribute(step) {
    table.renameAttribute(step.currentAttributeName, step.newAttributeName, step.collectionIndex || 1)
  },
  deleteAttribute(step) {
    table.deleteAttrbute(step.attributeName, step.collectionIndex || 1)
  },
  addFormula(step) {
    table.addFormula(step.attributeName, step.formula, step.collectionIndex || 1)
  },
  verifyValues(step) {
    table.verifyFormulaValues(step.attributeName, step.values, step.collectionIndex || 1)
  },
  checkFormulaExists(step) {
    table.checkFormulaExists(step.attributeName, step.formula, step.collectionIndex || 1)
  },
  editFormula(step) {
    table.editFormula(step.attributeName, step.formula, step.collectionIndex || 1)
  },
  createNewDataset(step) {
    table.createNewDataset()
  },
  insertCases(step) {
    table.openIndexMenuForRow(step.rowIndex)
    table.insertCases(step.numOfCases, "after")
  },
  changeSliderVariableName(step) {
    slider.changeVariableName(step.sliderVariableName)
  },
  changeSliderValue(step) {
    slider.changeVariableValue(step.sliderValue)
  },
  deleteSlider(step) {
    c.closeComponent("slider")
  }
}
