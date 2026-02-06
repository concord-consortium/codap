import { CalculatorTileElements as calc } from "../support/elements/calculator-tile"
import { ComponentElements as c } from "../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"

const calculatorName = "Calculator"

context("Calculator", () => {
  beforeEach(function () {
      const queryParams = "?sample=mammals&dashboard&mouseSensor&suppressUnsavedWarning"
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
  it("can make calculations with buttons", () => {
    calc.enterExpression("12X(1+2)=")
    calc.checkCalculatorDisplay("36")
  })
  it("can type expressions directly", () => {
    calc.typeExpression("2+3{enter}")
    calc.checkCalculatorDisplay("5")
  })
  it("can use formula functions", () => {
    calc.typeExpression("sqrt(16){enter}")
    calc.checkCalculatorDisplay("4")
  })
  it("can continue calculating after result", () => {
    calc.typeExpression("10{enter}")
    calc.checkCalculatorDisplay("10")
    // Typing an operator should keep the result
    calc.typeExpression("+5{enter}")
    calc.checkCalculatorDisplay("15")
  })
  it("clears with Escape key", () => {
    calc.typeExpression("123")
    calc.checkCalculatorDisplay("123")
    calc.getCalculatorInput().type("{esc}")
    calc.checkCalculatorDisplay("")
  })
  it("clears with C button", () => {
    calc.typeExpression("456")
    calc.checkCalculatorDisplay("456")
    calc.getCalcButton("C").click()
    calc.checkCalculatorDisplay("")
  })
  it("supports undo/redo for calculations", () => {
    // Perform a calculation
    calc.typeExpression("2+3{enter}")
    calc.checkCalculatorDisplay("5")

    // Undo should restore empty state
    toolbar.getUndoTool().click()
    calc.checkCalculatorDisplay("")

    // Redo should restore the result
    toolbar.getRedoTool().click()
    calc.checkCalculatorDisplay("5")
  })
  it("supports undo/redo for clearing", () => {
    // Enter and evaluate an expression
    calc.typeExpression("42{enter}")
    calc.checkCalculatorDisplay("42")

    // Clear the calculator
    calc.getCalcButton("C").click()
    calc.checkCalculatorDisplay("")

    // Undo should restore the previous value
    toolbar.getUndoTool().click()
    calc.checkCalculatorDisplay("42")

    // Redo should clear again
    toolbar.getRedoTool().click()
    calc.checkCalculatorDisplay("")
  })
  it("handles decimal calculations", () => {
    calc.typeExpression("3.14*2{enter}")
    calc.checkCalculatorDisplay("6.28")
  })
  it("shows error for invalid expressions", () => {
    // Unmatched parenthesis should cause a parse error
    calc.typeExpression("(2+3{enter}")
    // Errors are prefixed with #
    calc.getCalculatorInput().invoke("val").should("match", /^#/)
  })
  it("shows error for division by zero", () => {
    calc.typeExpression("1/0{enter}")
    calc.checkCalculatorDisplay("Infinity")
  })
})
