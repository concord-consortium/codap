import { ComponentElements as c } from "./component-elements"

export const CalculatorTileElements = {
  getCalculatorTile() {
    return c.getComponentTile("calculator")
  },
  getCalcButton(button) {
    return this.getCalculatorTile().find("[data-testid=calc-button]").contains(button)
  },
  enterExpression(expression) {
    Array.from(expression).forEach(char => {
      this.getCalcButton(char).click()
    })
  },
  checkCalculatorDisplay(answer) {
    this.getCalculatorTile().find("[data-testid=calc-input]").should("have.text", answer)
  }
}
