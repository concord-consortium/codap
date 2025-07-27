import { CalculatorTileElements as calc } from "../support/elements/calculator-tile"
import { ComponentElements as c } from "../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"

const calculatorName = "Calculator"

context("Calculator", () => {
  beforeEach(function () {
      const queryParams = "?sample=mammals&dashboard&mouseSensor&suppressUnsavedWarning=true"
      const url = `${Cypress.config("index")}${queryParams}`
      cy.visit(url)
      cy.wait(2500) // Ensuring the page and components are fully loaded.
  })
  it("populates default title", () => {
    c.getComponentTitle("calculator").should("contain", calculatorName)
  })
  it("updates calculator title with undo/redo", () => {
    const newCalculatorName = "my calc"
    c.getComponentTitle("calculator").should("have.text", calculatorName)
    c.changeComponentTitle("calculator", newCalculatorName)
    c.getComponentTitle("calculator").should("have.text", newCalculatorName)

    cy.log("Check update calculator title with undo/redo")
    // Undo title change
    toolbar.getUndoTool().click()
    c.getComponentTitle("calculator").should("have.text", calculatorName)

    // Redo title change
    toolbar.getRedoTool().click()
    c.getComponentTitle("calculator").should("have.text", newCalculatorName)
  })
  it("close calculator from toolshelf with undo/redo", () => {
    const newCalculatorName = "my calc"
    c.getComponentTitle("calculator").should("contain", calculatorName)
    c.changeComponentTitle("calculator", newCalculatorName)
    c.getComponentTitle("calculator").should("have.text", newCalculatorName)

    c.getIconFromToolShelf("calc").click()
    c.checkComponentDoesNotExist("calculator")

    cy.log("Check undo/redo of close and open calculator component")

    // Undo closing calculator (Reopen)
    toolbar.getUndoTool().click()
    c.checkComponentExists("calculator")

    // Redo closing calculator
    toolbar.getRedoTool().click()
    c.checkComponentDoesNotExist("calculator")

    c.getIconFromToolShelf("calc").click()
    c.checkComponentExists("calculator")
    c.getComponentTitle("calculator").should("contain", newCalculatorName)
  })
  it("close calculator from close button with undo/redo", () => {
    const newCalculatorName = "my calc"
    c.getComponentTitle("calculator").should("contain", calculatorName)
    c.changeComponentTitle("calculator", newCalculatorName)
    c.getComponentTitle("calculator").should("have.text", newCalculatorName)

    c.closeComponent("calculator")
    c.checkComponentDoesNotExist("calculator")

    // Undo closing calculator (Reopen)
    toolbar.getUndoTool().click()
    c.checkComponentExists("calculator")

    // Redo closing calculator
    toolbar.getRedoTool().click()
    c.checkComponentDoesNotExist("calculator")

    c.getIconFromToolShelf("calc").click()
    c.checkComponentExists("calculator")
    c.getComponentTitle("calculator").should("contain", newCalculatorName)
  })
  it("checks all calculator tooltips", () => {
    c.selectTile("calculator")
    toolbar.getToolShelfIcon("calc").then($element => {
      c.checkToolTip($element, c.tooltips.calculatorToolShelfIcon)
    })
    c.getMinimizeButton("calculator").then($element => {
      c.checkToolTip($element, c.tooltips.minimizeComponent)
    })
    c.getCloseButton("calculator").then($element => {
      c.checkToolTip($element, c.tooltips.closeComponent)
    })
  })
  it("can make calculations", () => {
    calc.enterExpression("12X(1+2)=")
    calc.checkCalculatorDisplay("36")
  })
})
