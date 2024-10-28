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
  it("populates default title, variable name and value", () => {
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

  })
  it("updates slider title with undo/redo", () => {
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
  })
  it("updates variable name", () => {
    slider.getVariableName().should("have.text", "v1")
    slider.changeVariableName(newName)
    slider.getVariableName().should("have.text", newName)
    c.getComponentTitle("slider").should("have.text", newName)
  })
  it("adds new variable value", () => {
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.changeVariableValue(newSliderValue)
    slider.getVariableValue().should("contain", newSliderValue)
  })

  it("plays and pauses slider", () => {
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.playSliderButton()
    slider.checkPlayButtonIsRunning()
    slider.pauseSliderButton()
    slider.checkPlayButtonIsPaused()
    slider.getVariableValue().should("not.equal", initialSliderValue)
  })
  // I stopped here. I think the animation rate is wrong.
  it.only("replays from initial value once it reaches the end", () => {
    slider.setAnimationRate(3)
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.playSliderButton()
    slider.checkPlayButtonIsRunning()
    cy.wait(15000)
    slider.checkPlayButtonIsPaused()
    slider.getVariableValue().should("contain", finalSliderValue)
    slider.playSliderButton()
    slider.getVariableValue().should("contain", "0")
  })
  it.skip("plays low to high animation direction", () => {
    slider.setAnimationRate(3)
    slider.setAnimationDirection("lowToHigh")
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.playSliderButton()
    slider.checkPlayButtonIsRunning()
    slider.getVariableValue().should("contain", finalSliderValue)
    slider.checkPlayButtonIsPaused()
  })
  it.skip("plays back and forth animation direction", () => {
    slider.setAnimationRate(3)
    slider.setAnimationDirection("backAndForth")
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.playSliderButton()
    slider.checkPlayButtonIsRunning()
    slider.getVariableValue().should("contain", finalSliderValue)
    slider.checkPlayButtonIsRunning()
    slider.getVariableValue().should("contain", "2.5")
    slider.checkPlayButtonIsPaused()
  })
  it.skip("plays high to low animation direction", () => {
    slider.setAnimationRate(3)
    slider.setAnimationDirection("highToLow")
    slider.changeVariableValue(finalSliderValue)
    slider.getVariableValue().should("contain", finalSliderValue)
    slider.playSliderButton()
    slider.checkPlayButtonIsRunning()
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.checkPlayButtonIsPaused()
  })
  it.skip("plays nonstop", () => {
    slider.setAnimationRate(3)
    slider.setAnimationRepetition("nonStop")
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.playSliderButton()
    slider.checkPlayButtonIsRunning()
    slider.getVariableValue().should("contain", finalSliderValue)
    slider.checkPlayButtonIsRunning()
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.checkPlayButtonIsRunning()
  })
  it.skip("plays with restricting multiples", () => {
    const initialValue = "0"
    const finalValue = "60"
    const multiple = "10"
    const values = ["10", "20", "30", "40", "50", "60"]

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
  })
  it.skip("creates another slider from toolshelf", () => {
    c.getIconFromToolShelf("slider").click()

    c.getComponentTitle("slider").should("contain", sliderName)
    slider.getVariableName().should("have.text", sliderName)
    slider.getVariableValue().should("contain", initialSliderValue)
    slider.checkPlayButtonIsPaused()

    c.getComponentTitle("slider", 1).should("contain", newName)
    slider.getVariableName(1).should("have.text", newName)
    slider.getVariableValue(1).should("contain", initialSliderValue)
    slider.checkPlayButtonIsPaused(1)
  })
  it.skip("checks editing variable name in one slider only affects that slider", () => {
    const newSliderName = "xyz"
    c.getIconFromToolShelf("slider").click()

    slider.changeVariableName(newSliderName, 1)
    c.getComponentTitle("slider", 0).should("contain", sliderName)
    c.getComponentTitle("slider", 1).should("contain", newSliderName)
    slider.getVariableName(0).should("have.text", sliderName)
    slider.getVariableName(1).should("have.text", newSliderName)
  })
  it.skip("checks editing variable value in one slider only affects that slider", () => {
    const newVariableValue = "100"
    c.getIconFromToolShelf("slider").click()

    slider.changeVariableValue(newVariableValue, 1)
    slider.getVariableValue(0).should("contain", initialSliderValue)
    slider.getVariableValue(1).should("contain", newVariableValue)
  })
  it.skip("checks playing in one slider only plays that slider", () => {
    c.getIconFromToolShelf("slider").click()
    slider.setAnimationRate(3, 1)

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
  it.skip("creates sliders with incrementing names", () => {
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
  it.skip("checks all slider tooltips", () => {
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
      c.checkToolTip($element, c.tooltips.inspectorPanel)
    })
  })
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
})
