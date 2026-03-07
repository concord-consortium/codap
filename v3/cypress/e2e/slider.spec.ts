import { SliderTileElements as slider } from "../support/elements/slider-tile"
import { ComponentElements as c } from "../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { CfmElements as cfm } from "../support/elements/cfm"

const sliderName = "v1"
const newName = "v2"
const initialSliderValue = "0.5"
const finalSliderValue = "11.5"
const newSliderValue = "0.6"

context("Slider UI", () => {
  beforeEach(function () {
    cy.visit(Cypress.config("index"))
    cy.get('[data-testid="Create New Document-button"]').click()
    cfm.openExampleDocument("Mammals")
    cy.wait(2500)
    // Close only the Mammals Sample Guide component
    cy.contains('[data-testid="component-title-bar"]', "Mammals Sample Guide")
      .parents('.codap-component')
      .find('[data-testid="component-close-button"]')
      .first()
      .click({ force: true })
    // Open a new slider from the tool shelf
    c.getIconFromToolShelf("slider").click()
    slider.getSliderTile().should("be.visible")
  })
  it("basic Slider UI", () => {
    cy.log("populates default title, variable name and value and checks tooltips")
    c.getComponentTitle("slider").should("contain", sliderName)
    slider.getVariableName().should("eq", sliderName)
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.checkPlayButtonIsPaused()
    slider.getSliderThumbIcon().should("be.visible")
    slider.getSliderAxis().should("be.visible")

    // undo should work after opening the Slider
    // TODO: add back this code (blocker: #187612762)
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
    slider.getVariableName().should("eq", sliderName)

    // undo should work after renaming the component
    cy.log("check for undo/redo after renaming Slider component")
    toolbar.getUndoTool().click()
    c.getComponentTitle("slider").should("have.text", oldSliderName)

    toolbar.getRedoTool().click()
    c.getComponentTitle("slider").should("have.text", newSliderName)
    c.closeComponent("slider") //Change in component header height causes interference with variable value input

    cy.log("updates variable name")
    c.clickIconFromToolShelf("slider")
    slider.getSliderTile().should("be.visible")
    c.getComponentTitle("slider").should("have.text", "v1")

    slider.getVariableName().should("eq", "v1")
    slider.changeVariableName(newName)
    slider.getVariableName().should("eq", newName)
    c.getComponentTitle("slider").should("have.text", newName)

    cy.log("adds new variable value")
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.changeVariableValue(newSliderValue)
    slider.getVariableValue().should("contain", newSliderValue)
    c.closeComponent("slider") //Change in component header height causes interference with variable value input


    cy.log("creates another slider from toolshelf")
    c.clickIconFromToolShelf("slider")
    slider.getSliderTile().should("be.visible")
    c.getComponentTitle("slider").should("have.text", "v1")
    c.getIconFromToolShelf("slider").click()

    c.getComponentTitle("slider").should("contain", sliderName)
    slider.getVariableName().should("eq", sliderName)
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.checkPlayButtonIsPaused()

    c.getComponentTitle("slider", 1).should("contain", newName)
    slider.getVariableName(1).should("eq", newName)
    slider.getVariableValue(1).should("contain", initialSliderValue)
    slider.checkPlayButtonIsPaused(1)

    cy.log("creates sliders with incrementing names")
    c.getIconFromToolShelf("slider").click()

    c.getComponentTitle("slider").should("contain", sliderName)
    slider.getVariableName().should("eq", sliderName)
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.checkPlayButtonIsPaused()

    c.getComponentTitle("slider", 1).should("contain", "v2")
    slider.getVariableName(1).should("eq", "v2")
    slider.getVariableValue(1).should("contain", initialSliderValue)
    slider.checkPlayButtonIsPaused(1)

    c.getIconFromToolShelf("slider").click()
    c.getComponentTitle("slider", 2).should("contain", "v3")
    slider.getVariableName(2).should("eq", "v3")
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
    // Override setInterval/clearInterval so cy.tick() can control the slider animation.
    // We specify only these methods (rather than calling cy.clock() with no args) because
    // overriding all timing functions (including setTimeout) breaks Chakra UI select menus
    // in the slider toolbar's flyout sections.
    cy.clock(Date.now(), ["setInterval", "clearInterval"])
    c.clickIconFromToolShelf("slider")
    slider.getSliderTile().should("be.visible")
    c.getComponentTitle("slider").should("have.text", "v1")
    slider.setAnimationRate(30)
    slider.getVariableValue().should("contain", initialSliderValue)
    cy.log("play slider")
    slider.playSliderButton()
    slider.checkPlayButtonIsRunning()
    cy.tick(15000)
    slider.checkPlayButtonIsPaused()
    slider.getVariableValue().should("contain", finalSliderValue)
    slider.playSliderButton()
    slider.getVariableValue().should("contain", "0")
    c.closeComponent("slider") //Change in component header height causes interference with variable value input
    cy.clock().then(clock => clock.restore())

    cy.log("plays low to high animation direction")
    cy.clock(Date.now(), ["setInterval", "clearInterval"])
    c.clickIconFromToolShelf("slider")
    slider.getSliderTile().should("be.visible")
    c.getComponentTitle("slider").should("have.text", "v1")
    slider.setAnimationRate(50)
    slider.setAnimationDirection("lowToHigh")
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.playSliderButton()
    slider.checkPlayButtonIsRunning()
    cy.tick(15000)
    slider.getVariableValueInput(0).should("have.value", finalSliderValue)
    slider.checkPlayButtonIsPaused()
    c.closeComponent("slider") //Change in component header height causes interference with variable value input
    cy.clock().then(clock => clock.restore())

    cy.log("plays back and forth animation direction")
    cy.clock(Date.now(), ["setInterval", "clearInterval"])
    c.clickIconFromToolShelf("slider")
    slider.getSliderTile().should("be.visible")
    c.getComponentTitle("slider").should("have.text", "v1")
    slider.setAnimationRate(5)
    slider.setAnimationDirection("backAndForth")
    slider.setMultipleRestriction("1")
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.playSliderButton()
    slider.checkPlayButtonIsRunning()
    cy.tick(2000)   // 10 ticks at 200ms each: slider reaches 11
    slider.getVariableValueInput(0).should("have.value", "11")
    slider.checkPlayButtonIsRunning()
    cy.tick(2600)   // 13 ticks at 200ms each: animation completes and stops at axisMin (value=0)
    slider.checkPlayButtonIsPaused()
    slider.getVariableValueInput(0).should("have.value", "0")
    c.closeComponent("slider") //Change in component header height causes interference with variable value input
    cy.clock().then(clock => clock.restore())

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
    c.closeComponent("slider") //Change in component header height causes interference with variable value input


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
    c.closeComponent("slider") //Change in component header height causes interference with variable value input


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
    slider.getVariableName(0).should("eq", sliderName)
    slider.getVariableName(1).should("eq", newSliderName)
  })
  // TODO: This test is flaky and needs to be fixed
  it.skip("checks slider with dates", () => {
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
  it("checks editing variable value in one slider only affects that slider", () => {
    const newVariableValue = "0.5"
    c.getIconFromToolShelf("slider").click()

    slider.changeVariableValue(newVariableValue, 1)
    slider.getVariableValue(0).should("contain", initialSliderValue)
    slider.getVariableValue(1).should("contain", newVariableValue)
  })
  it("checks min max slider values", () => {
    const MAX_VALUE = 11.5
    const MIN_VALUE = 0
    const MID_VALUE = 5

    slider.getVariableValue().should("contain", initialSliderValue)

    // Set to max value
    cy.log('Setting value to max')
    slider.changeVariableValue(MAX_VALUE)
    cy.wait(1000) // Wait for any animations
    slider.getVariableValueInput().should('have.value', MAX_VALUE.toString())

    // Set to min value
    cy.log('Setting value to min')
    slider.changeVariableValue(MIN_VALUE)
    cy.wait(1000) // Wait for any animations
    slider.getVariableValueInput().should('have.value', MIN_VALUE.toString())

    // Set to middle value
    cy.log('Setting value to middle')
    slider.changeVariableValue(MID_VALUE)
    cy.wait(1000) // Wait for any animations
    slider.getVariableValueInput().should('have.value', MID_VALUE.toString())
  })
  it("reuses slider names after existing ones are closed", () => {
    c.closeComponent("slider") //Change in component header height causes interference with variable value input

    c.checkComponentDoesNotExist("slider")
    c.getIconFromToolShelf("slider").click()

    c.getComponentTitle("slider").should("contain", "v1")
    slider.getVariableName().should("eq", "v1")
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.checkPlayButtonIsPaused()

    c.closeComponent("slider") //Change in component header height causes interference with variable value input

    c.checkComponentDoesNotExist("slider")
    c.getIconFromToolShelf("slider").click()

    c.getComponentTitle("slider").should("contain", "v1")
    slider.getVariableName().should("eq", "v1")
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.checkPlayButtonIsPaused()

  })
  it("slider keyboard accessibility", () => {
    const thumbInput = () => slider.getSliderThumbIcon().find("input")

    cy.log("thumb shows focus ring on keyboard focus")
    // Click the thumb to focus it (no focus ring on mouse focus), then Tab away and Shift+Tab back
    slider.getSliderThumbIcon().click()
    slider.getSliderThumbIcon().should("not.have.class", "focus-visible")
    cy.realPress("Tab")
    cy.realPress(["Shift", "Tab"])
    slider.getSliderThumbIcon().should("have.class", "focus-visible")
    cy.realPress("Tab")
    slider.getSliderThumbIcon().should("not.have.class", "focus-visible")

    cy.log("arrow keys change slider value")
    slider.changeVariableValue("5")
    slider.getSliderThumbIcon().click()
    cy.realPress("ArrowRight")
    thumbInput().invoke("val").then(val => {
      expect(Number(val)).to.be.greaterThan(5)
    })
    cy.realPress("ArrowLeft")
    // After right then left, value should be back to 5
    slider.getVariableValueInput().should("have.value", "5")

    cy.log("Home and End keys jump to axis bounds")
    cy.realPress("Home")
    thumbInput().invoke("val").then(val => {
      thumbInput().invoke("attr", "min").then(min => {
        expect(Number(val)).to.equal(Number(min))
      })
    })
    cy.realPress("End")
    thumbInput().invoke("val").then(val => {
      thumbInput().invoke("attr", "max").then(max => {
        expect(Number(val)).to.equal(Number(max))
      })
    })

    cy.log("play/pause button has correct aria-label")
    slider.getPlayButton().should("have.attr", "aria-label", "Play slider")
    slider.playSliderButton()
    slider.getPlayButton().should("have.attr", "aria-label", "Pause slider")
    slider.pauseSliderButton()
    slider.getPlayButton().should("have.attr", "aria-label", "Play slider")

    cy.log("tab order through slider controls: play/pause → name → value → thumb")
    slider.getPlayButton().focus()
    slider.getPlayButton().should("be.focused")
    cy.realPress("Tab")
    slider.getVariableNameInput().should("be.focused")
    cy.realPress("Tab")
    slider.getVariableValueInput().should("be.focused")
    cy.realPress("Tab")
    thumbInput().should("be.focused")
    // Shift+Tab back through the controls
    cy.realPress(["Shift", "Tab"])
    slider.getVariableValueInput().should("be.focused")
    cy.realPress(["Shift", "Tab"])
    slider.getVariableNameInput().should("be.focused")
    cy.realPress(["Shift", "Tab"])
    slider.getPlayButton().should("be.focused")

    cy.log("aria-live region announces animation state changes")
    slider.getSliderTile().find("[role=status]").should("exist")
    slider.playSliderButton()
    slider.getSliderTile().find("[role=status]").should("have.text", "Slider animation started")
    slider.pauseSliderButton()
    slider.getSliderTile().find("[role=status]").should("have.text", "Slider animation stopped")
  })
})
