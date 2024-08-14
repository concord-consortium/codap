import { ComponentElements as c } from "./component-elements"

export const CalculatorTileElements = {
  getCalculatorTile() {
    return c.getComponentTile("calculator")
  },
  getCalcButton(button: string) {
    return this.getCalculatorTile().find("[data-testid=calc-button]").contains(button)
  },
  enterExpression(expression: string) {
    Array.from(expression).forEach(char => {
      this.getCalcButton(char).click()
    })
  },
  checkCalculatorDisplay(answer: string) {
    this.getCalculatorTile().find("[data-testid=calc-input]").should("have.text", answer)
  }
}
