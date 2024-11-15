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
