import { ComponentElements as c } from "./component-elements"

export const CalculatorTileElements = {
  getCalculatorTile() {
    return c.getComponentTile("calculator")
  },
  getCalculatorInput() {
    return this.getCalculatorTile().find("[data-testid=calc-input]")
  },
  getCalcButton(button: string) {
    return this.getCalculatorTile().find("[data-testid=calc-button]").contains(button)
  },
  enterExpression(expression: string) {
    Array.from(expression).forEach(char => {
      this.getCalcButton(char).click()
    })
  },
  typeExpression(expression: string) {
    this.getCalculatorInput().type(expression)
  },
  clearInput() {
    this.getCalculatorInput().clear()
  },
  checkCalculatorDisplay(answer: string) {
    this.getCalculatorInput().should("have.value", answer)
  }
}
