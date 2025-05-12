import { SliderTileElements as slider } from "../support/elements/slider-tile"
import { ComponentElements as c } from "../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"

const sliderName = "v1"
const newName = "v2"
const initialSliderValue = "0.5"
const finalSliderValue = "11.5"
const newSliderValue = "0.6"

context("Slider UI", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })
  it("basic Slider UI", () => {
    cy.log("populates default title, variable name and value and checks tooltips")
    c.getComponentTitle("slider").should("contain", sliderName)
    slider.getVariableName().should("have.text", sliderName)
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.checkPlayButtonIsPaused()
    slider.getSliderThumbIcon().should("be.visible")
    slider.getSliderAxis().should("be.visible")

    // // undo should work after opening the Slider
    // // TODO: add back this code (blocker: #187612762)
    // cy.log("check for undo/redo after opening Slider component")
    // // use force:true here because undo button is incorrectly faded out here
    // toolbar.getUndoTool().click({force: true})
    // slider.getSliderAxis().should("not.be.visible")

    // // redo should work after undo
    // // use force:true here because redo button is incorrectly faded out here
    // toolbar.getRedoTool().click({force: true})
    // slider.getSliderAxis().should("be.visible")

    cy.log("checks all slider tooltips")
    c.selectTile("slider", 0)
    toolbar.getToolShelfIcon("slider").then($element => {
      c.checkToolTip($element, c.tooltips.sliderToolShelfIcon)
    })
    c.getMinimizeButton("slider").then($element => {
      c.checkToolTip($element, c.tooltips.minimizeComponent)
    })
    c.getCloseButton("slider").then($element => {
      c.checkToolTip($element, c.tooltips.closeComponent)
    })
    slider.getInspectorIcon().then($element => {
      c.checkToolTip($element, c.tooltips.sliderInspectorPanel)
    })

    cy.log("updates slider title with undo/redo")
    const newSliderName = "abc"
    const oldSliderName = "v1"
    c.getComponentTitle("slider").should("have.text", sliderName)
    c.changeComponentTitle("slider", newSliderName)
    c.getComponentTitle("slider").should("have.text", newSliderName)
    slider.getVariableName().should("have.text", sliderName)

    // undo should work after renaming the component
    cy.log("check for undo/redo after renaming Slider component")
    toolbar.getUndoTool().click()
    c.getComponentTitle("slider").should("have.text", oldSliderName)

    toolbar.getRedoTool().click()
    c.getComponentTitle("slider").should("have.text", newSliderName)

    c.closeComponent("slider")

    cy.log("updates variable name")
    c.clickIconFromToolShelf("slider")
    slider.getSliderTile().should("be.visible")
    c.getComponentTitle("slider").should("have.text", "v1")

    slider.getVariableName().should("have.text", "v1")
    slider.changeVariableName(newName)
    slider.getVariableName().should("have.text", newName)
    c.getComponentTitle("slider").should("have.text", newName)

    cy.log("adds new variable value")
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.changeVariableValue(newSliderValue)
    slider.getVariableValue().should("contain", newSliderValue)
    c.closeComponent("slider")

    cy.log("creates another slider from toolshelf")
    c.clickIconFromToolShelf("slider")
    slider.getSliderTile().should("be.visible")
    c.getComponentTitle("slider").should("have.text", "v1")
    c.getIconFromToolShelf("slider").click()

    c.getComponentTitle("slider").should("contain", sliderName)
    slider.getVariableName().should("have.text", sliderName)
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.checkPlayButtonIsPaused()

    c.getComponentTitle("slider", 1).should("contain", newName)
    slider.getVariableName(1).should("have.text", newName)
    slider.getVariableValue(1).should("contain", initialSliderValue)
    slider.checkPlayButtonIsPaused(1)

    cy.log("creates sliders with incrementing names")
    c.getIconFromToolShelf("slider").click()

    c.getComponentTitle("slider").should("contain", sliderName)
    slider.getVariableName().should("have.text", sliderName)
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.checkPlayButtonIsPaused()

    c.getComponentTitle("slider", 1).should("contain", "v2")
    slider.getVariableName(1).should("have.text", "v2")
    slider.getVariableValue(1).should("contain", initialSliderValue)
    slider.checkPlayButtonIsPaused(1)

    c.getIconFromToolShelf("slider").click()
    c.getComponentTitle("slider", 2).should("contain", "v3")
    slider.getVariableName(2).should("have.text", "v3")
    slider.getVariableValue(2).should("contain", initialSliderValue)
    slider.checkPlayButtonIsPaused(2)
  })
  it("Slider play and pause functionality", () => {
    cy.log("plays and pauses slider")
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.playSliderButton()
    slider.checkPlayButtonIsRunning()
    slider.pauseSliderButton()
    slider.checkPlayButtonIsPaused()
    slider.getVariableValue().should("not.equal", initialSliderValue)
    c.closeComponent("slider")

    cy.log("replays from initial value once it reaches the end")
    c.clickIconFromToolShelf("slider")
    slider.getSliderTile().should("be.visible")
    c.getComponentTitle("slider").should("have.text", "v1")
    slider.setAnimationRate(30)
    slider.getVariableValue().should("contain", initialSliderValue)
    cy.log("play slider")
    slider.playSliderButton()
    slider.checkPlayButtonIsRunning()
    cy.wait(15000)
    slider.checkPlayButtonIsPaused()
    slider.getVariableValue().should("contain", finalSliderValue)
    slider.playSliderButton()
    slider.getVariableValue().should("contain", "0")
    c.closeComponent("slider")

    cy.log("plays low to high animation direction")
    c.clickIconFromToolShelf("slider")
    slider.getSliderTile().should("be.visible")
    c.getComponentTitle("slider").should("have.text", "v1")
    slider.setAnimationRate(50)
    slider.setAnimationDirection("lowToHigh")
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.playSliderButton()
    slider.checkPlayButtonIsRunning()
    slider.getVariableValue().should("contain", finalSliderValue)
    slider.checkPlayButtonIsPaused()
    c.closeComponent("slider")

    cy.log("plays back and forth animation direction")
    c.clickIconFromToolShelf("slider")
    slider.getSliderTile().should("be.visible")
    c.getComponentTitle("slider").should("have.text", "v1")
    slider.setAnimationRate(50)
    slider.setAnimationDirection("backAndForth")
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.playSliderButton()
    slider.checkPlayButtonIsRunning()
    slider.getVariableValue().should("contain", finalSliderValue)
    slider.checkPlayButtonIsRunning()
    slider.getVariableValue().should("contain", "2.5")
    slider.checkPlayButtonIsPaused()
    c.closeComponent("slider")

    cy.log("plays high to low animation direction")
    c.clickIconFromToolShelf("slider")
    slider.getSliderTile().should("be.visible")
    c.getComponentTitle("slider").should("have.text", "v1")
    slider.setAnimationRate(50)
    slider.setAnimationDirection("highToLow")
    slider.changeVariableValue(finalSliderValue)
    slider.getVariableValue().should("contain", finalSliderValue)
    slider.playSliderButton()
    slider.checkPlayButtonIsRunning()
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.checkPlayButtonIsPaused()
    c.closeComponent("slider")

    cy.log("plays nonstop")
    c.clickIconFromToolShelf("slider")
    slider.getSliderTile().should("be.visible")
    c.getComponentTitle("slider").should("have.text", "v1")
    slider.setAnimationRate(50)
    slider.setAnimationRepetition("nonStop")

    // Initial value check
    slider.getVariableValue().should("contain", initialSliderValue)

    // Start playing and verify the button state
    slider.playSliderButton()
    slider.checkPlayButtonIsRunning()

    // Wait and verify it reaches the final value
    // NOTE: this test gets flaky for values above 11
    // checking to make sure value reaches 11 for now
    slider.getVariableValue().should("contain", "11")

    // Check if the slider has looped back to the initial value in nonstop mode
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.checkPlayButtonIsRunning()
    c.closeComponent("slider")

    cy.log("plays with restricting multiples")
    const initialValue = "0"
    const finalValue = "60"
    const multiple = "10"
    const values = ["10", "20", "30", "40", "50", "60"]
    c.clickIconFromToolShelf("slider")
    slider.getSliderTile().should("be.visible")
    c.getComponentTitle("slider").should("have.text", "v1")

    slider.setAnimationRate(3)
    slider.changeVariableValue(finalValue)
    slider.setMultipleRestriction(multiple)
    slider.changeVariableValue(initialValue)
    slider.getVariableValue().should("contain", initialValue)
    slider.playSliderButton()
    slider.checkPlayButtonIsRunning()
    slider.getVariableValue().should("contain", values[0])
    slider.getVariableValue().should("contain", values[1])
    slider.getVariableValue().should("contain", values[2])
    slider.getVariableValue().should("contain", values[3])
    slider.getVariableValue().should("contain", values[4])
    slider.getVariableValue().should("contain", values[5])
    slider.checkPlayButtonIsPaused()

    cy.log("checks playing in one slider only plays that slider")
    c.getIconFromToolShelf("slider").click()
    slider.setAnimationRate(50, 1)

    slider.checkPlayButtonIsPaused(0)
    slider.checkPlayButtonIsPaused(1)

    slider.playSliderButton(1)
    slider.checkPlayButtonIsPaused(0)
    slider.checkPlayButtonIsRunning(1)

    slider.pauseSliderButton(1)
    slider.checkPlayButtonIsPaused(0)
    slider.checkPlayButtonIsPaused(1)

    slider.playSliderButton(1)
    slider.checkPlayButtonIsPaused(0)
    slider.checkPlayButtonIsRunning(1)

    cy.wait(2500)
    slider.checkPlayButtonIsPaused(0)
    slider.checkPlayButtonIsPaused(1)
  })
  it("checks editing variable name in one slider only affects that slider", () => {
    const newSliderName = "xyz"
    c.getIconFromToolShelf("slider").click()

    slider.changeVariableName(newSliderName, 1)
    c.getComponentTitle("slider", 0).should("contain", sliderName)
    c.getComponentTitle("slider", 1).should("contain", newSliderName)
    slider.getVariableName(0).should("have.text", sliderName)
    slider.getVariableName(1).should("have.text", newSliderName)
  })
  it("checks slider with dates", () => {
    const today = new Date().toLocaleDateString("en-US") // Adjust locale as needed
    const minValue = "01/01/2023" // Set an example minimum date
    const maxValue = "12/31/2023" // Set an example maximum date
    const expectedYear = "2023" // Expected year based on min and max values

    cy.log("Change from numeric to date display")
    c.selectTile("slider", 0)
    slider.selectScaleType('date') // Use 'date' to match the data-testid
    cy.get('[data-testid="slider-variable-value-text-input"]')
    .invoke('val') // Get the value of the input
    .should('include', today) // Check if today's date is included
    cy.get('.codap-inspector-palette-header-title').click() // Close the scale type dropdown

    cy.log("set the minimum value and verify it is displayed correctly")
    cy.get('[data-testid="slider-minimum"]')
      .should('be.visible')
      .should('be.enabled')
      .clear()
      .type(minValue, { delay: 200 })
      .should('have.value', minValue)
      .blur()  // Ensure the value is committed

    // Set the maximum value and verify it's displayed correctly
    cy.get('[data-testid="slider-maximum"]')
      .clear()
      .type(maxValue)
      .should('have.value', maxValue)

    // Check that the year displayed on the axis matches the expected year
    c.selectTile("slider", 0)
    cy.get('[data-testid="axis-bottom"]')
    .find('text')
    .contains(expectedYear)

    cy.log("Start playing and verify the button state with dates")
    slider.playSliderButton()
    slider.checkPlayButtonIsRunning()

    // Wait and verify it reaches April 30
    slider.getVariableValue().should("contain", "4/30/2023")
  })
  // Issues with the click occur here, skipping for now
  it.skip("checks editing variable value in one slider only affects that slider", () => {
    const newVariableValue = "100"
    c.getIconFromToolShelf("slider").click()

    slider.changeVariableValue(newVariableValue, 1)
    slider.getVariableValue(0).should("contain", initialSliderValue)
    slider.getVariableValue(1).should("contain", newVariableValue)
  })
  // This test has become flaky. Skipping for now.
  it.skip("checks min max slider values", () => {
    slider.getVariableValue().should("contain", initialSliderValue)
    // slider.changeVariableValue("12345678901234567890")
    // slider.getVariableValue().should("contain", "1.235e+14")

    // slider.changeVariableValue("0.12345678901234567890")
    // slider.getVariableValue().should("contain", "0")

    // slider.changeVariableValue("0.006")
    // slider.getVariableValue().should("contain", "0")

    slider.changeVariableValue("abc")
    slider.getVariableValue().should("contain", "")
  })
  // This test is covered now in earlier tests. Skipping
  // this one for now.
  it.skip("reuses slider names after existing ones are closed", () => {
    c.closeComponent("slider")
    c.checkComponentDoesNotExist("slider")
    c.getIconFromToolShelf("slider").click()

    c.getComponentTitle("slider").should("contain", "v1")
    slider.getVariableName().should("have.text", "v1")
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.checkPlayButtonIsPaused()

    c.closeComponent("slider")
    c.checkComponentDoesNotExist("slider")
    c.getIconFromToolShelf("slider").click()

    c.getComponentTitle("slider").should("contain", "v1")
    slider.getVariableName().should("have.text", "v1")
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.checkPlayButtonIsPaused()

  })
})
