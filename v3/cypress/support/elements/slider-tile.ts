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
    return this.getVariableValueInput(index).invoke('val')
  },
  getVariableValueInput(index = 0) {
    return this.getSliderTile(index).find("[data-testid=slider-variable-value-text-input]")
  },
  changeVariableValue(value: number | string, index = 0) {
    this.getVariableValueInput(index)
      .click({ force: true })
    cy.wait(500)
    this.getVariableValueInput(index)
      .dblclick({ force: true })
    this.getVariableValueInput(index)
      .clear({ force: true })
    this.getVariableValueInput(index)
      .type(`${value}`, { delay: 200, force: true })
    this.getVariableValueInput(index)
      .blur()
    this.getVariableValueInput(index)
      .should('have.value', `${value}`)
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
    this.getPlayButton(index)
      .invoke("attr", "class")
      .should(($class) => {
        expect($class).to.include("paused")
      })
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
  getRulerIcon() {
    return c.getInspectorPanel().find("[data-testid=slider-scale-button]")
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
    // Open the animation direction dropdown
    this.getAnimationDirection().click()
    // Select the specified direction from the dropdown menu
    cy.contains('[role="menuitem"]', direction).click()
    // Close the inspector panel if necessary
    this.clickInspectorPanel()
  },
  getAnimationRepetition() {
    return c.getInspectorPanel().find("[data-testid=slider-animation-repetition]") // Targets the dropdown button itself
  },
  setAnimationRepetition(repetition: string, index = 0) {
    c.selectTile("slider", index)
    this.clickInspectorPanel()
    // Open the repetition dropdown
    this.getAnimationRepetition().click()
    // Select the specified repetition option from the dropdown menu
    cy.contains('[role="menuitem"]', repetition).click()
    // Close the inspector panel if needed
    this.clickInspectorPanel()
  },
  selectScaleType(scaleType: "numeric" | "date", index = 0) {
    // const today = new Date().toLocaleDateString("en-US")
    // Grab the button that opens the scale type menu
    this.getRulerIcon().click()
    cy.get('[data-testid="slider-scale-type-button"]').click()
    // Choose either Numeric or Date-Time based on the provided scaleType
    cy.clickWhenClickable(`[data-testid="slider-scale-${scaleType}"]`)
    // cy.get('[data-testid="slider-date-display"]').should("have.text", today)
  },
  addSlider() {
    c.getIconFromToolShelf("slider").click()
  },
  deleteSlider() {
    c.closeComponent("slider")
  },
}
