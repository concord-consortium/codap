import { ComponentElements as c } from "./component-elements"

export const SliderTileElements = {
  getSliderTile(index = 0) {
    return c.getComponentTile("slider", index)
  },
  getVariableName(index = 0) {
    return this.getSliderTile(index).find("[data-testid=slider-variable-name-text]")
  },
  getVariableNameInput(index = 0) {
    return this.getSliderTile(index).find("[data-testid=slider-variable-name-text-input]")
  },
  changeVariableName(name: string, index = 0) {
    this.getVariableName(index).click()
    this.getVariableNameInput(index).clear()
    this.getVariableNameInput(index).type(`${name}{enter}`)
  },
  getVariableValue(index = 0) {
    return this.getSliderTile(index).find("[data-testid=slider-variable-value-text-input]").invoke("attr", "value")
  },
  getVariableValueInput(index = 0) {
    return this.getSliderTile(index).find("[data-testid=slider-variable-value-text-input]")
  },
  changeVariableValue(value: number | string, index = 0) {
    this.getVariableValueInput(index).click()
    this.getVariableValueInput(index).clear()
    this.getVariableValueInput(index).type(`${value}{enter})`)
  },
  getPlayButton(index = 0) {
    return this.getSliderTile(index).find("[data-testid=slider-play-pause]")
  },
  playSliderButton(index = 0) {
    this.checkPlayButtonIsPaused(index)
    this.getPlayButton(index).click()
  },
  pauseSliderButton(index = 0) {
    this.checkPlayButtonIsRunning(index)
    this.getPlayButton(index).click()
  },
  checkPlayButtonIsPaused(index = 0) {
    this.getPlayButton(index).invoke("attr", "class").should("contain", "paused")
  },
  checkPlayButtonIsRunning(index = 0) {
    this.getPlayButton(index).invoke("attr", "class").should("contain", "running")
  },
  getSliderThumbIcon(index = 0) {
    return this.getSliderTile(index).find("[data-testid=slider-thumb-icon]")
  },
  getSliderAxis(index = 0) {
    return this.getSliderTile(index).find("[data-testid=slider-axis]")
  },
  getInspectorIcon() {
    return c.getInspectorPanel().find("[data-testid=slider-values-button]")
  },
  clickInspectorPanel() {
    this.getInspectorIcon().click()
  },
  getMultipleRestriction() {
    return c.getInspectorPanel().find("[data-testid=slider-restrict-multiples]")
  },
  setMultipleRestriction(multiple: string, index = 0) {
    c.selectTile("slider", index)
    this.clickInspectorPanel()
    this.getMultipleRestriction().find("input").type(`${multiple}{enter}`)
  },
  checkMultipleRestriction(multiple: string, index = 0) {
    c.selectTile("slider", index)
    this.clickInspectorPanel()
    this.getMultipleRestriction().find("input").invoke("attr", "value").should("contain", multiple)
    this.clickInspectorPanel()
  },
  getAnimationRate() {
    return c.getInspectorPanel().find("[data-testid=slider-animation-rate]")
  },
  setAnimationRate(rate: number, index = 0) {
    c.selectTile("slider", index)
    this.clickInspectorPanel()
    this.getAnimationRate().find("input").type(`${rate}{enter}`)
  },
  checkAnimationRate(rate: number, index = 0) {
    c.selectTile("slider", index)
    this.clickInspectorPanel()
    this.getAnimationRate().find("input").invoke("attr", "value").should("contain", rate)
    this.clickInspectorPanel()
  },
  getAnimationDirection() {
    return c.getInspectorPanel().find("[data-testid=slider-animation-direction]")
  },
  setAnimationDirection(direction: string, index = 0) {
    c.selectTile("slider", index)
    this.clickInspectorPanel()
    this.getAnimationDirection().select(direction)
    this.clickInspectorPanel()
  },
  getAnimationRepetition() {
    return c.getInspectorPanel().find("[data-testid=slider-animation-repetition]")
  },
  setAnimationRepetition(repetition: string, index = 0) {
    c.selectTile("slider", index)
    this.clickInspectorPanel()
    this.getAnimationRepetition().select(repetition)
    this.clickInspectorPanel()
  }
}
