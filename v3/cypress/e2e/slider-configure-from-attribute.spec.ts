import { ComponentElements as c } from "../support/elements/component-elements"
import { SliderTileElements as slider } from "../support/elements/slider-tile"

// the Mammals dashboard already contains a variable slider ("v1"), which these tests drop onto
const baseParams = "?sample=mammals&dashboard&mouseSensor&suppressUnsavedWarning"

// opens the Mammals dashboard and waits for the table and the slider to render
function visitMammals(extraParams = "") {
  cy.visit(`${Cypress.config("index")}${baseParams}${extraParams}`)
  cy.get('.codap-case-table [data-testid="codap-attribute-button Sleep"]').should("be.visible")
  slider.getSliderTile().should("be.visible")
}

function expectSliderUnchangedByDrop(attribute: string) {
  c.getComponentTitle("slider").invoke("text").then(title => {
    slider.getVariableValue().then(value => {
      cy.dragAttributeToTarget("table", attribute, "slider")
      // asserting that nothing happened, so give a (wrong) change time to render before checking
      cy.wait(300)
      c.getComponentTitle("slider").should("have.text", title)
      slider.getVariableValue().should("eq", value)
    })
  })
}

// Drops Sleep onto the slider and checks that it's configured: after an ignored drop, this shows the drag
// really reached the slider, so the ignored drop was ignored rather than missed.
function expectSleepDropConfiguresSlider() {
  cy.dragAttributeToTarget("table", "Sleep", "slider")
  // the Mammals dataset's (only) collection is "Cases"
  c.getComponentTitle("slider").should("have.text", "Cases")
}

context("Slider configured from an attribute", () => {
  it("configures from a dropped numeric attribute, titled for the childmost collection", () => {
    visitMammals("&features=visibilitySlider")
    c.getComponentTitle("slider").should("not.have.text", "Cases")
    cy.dragAttributeToTarget("table", "Sleep", "slider")
    // the Mammals dataset's (only) collection is "Cases"
    c.getComponentTitle("slider").should("have.text", "Cases")
    // the range starts at Sleep's minimum, and a range slider shows its range in place of the variable's value
    slider.getSliderTile().find('[data-testid="slider-range-values"] .range-text')
      .invoke("text").should("match", /^2 - /)
  })

  // No drop onto the slider can succeed with the flag off, so there's no follow-up drop here to show that the
  // drag reached it; the categorical test below shows that for the same drag and layout.
  it("ignores the drop when the flag is off", () => {
    visitMammals()
    expectSliderUnchangedByDrop("Sleep")
  })

  it("leaves the slider unselected when a drop is ignored", () => {
    visitMammals("&features=visibilitySlider")
    c.selectTile("table", 0)
    c.checkComponentFocused("slider", false)
    cy.dragAttributeToTarget("table", "Diet", "slider")
    cy.wait(300)
    c.checkComponentFocused("slider", false)
    expectSleepDropConfiguresSlider()
  })

  // Drop collision detection prefers the tile painted under the pointer, found by testing whether a
  // droppable contains the element there, so the slider's droppable must contain its painted content.
  it("has a drop target that contains what is painted over it", () => {
    visitMammals("&features=visibilitySlider")
    cy.get('[data-testid="slider-drop-overlay"]').first().then($drop => {
      const drop = $drop[0]
      const rect = drop.getBoundingClientRect()
      const topElt = drop.ownerDocument.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
      expect(drop.contains(topElt)).to.equal(true)
    })
  })

  it("ignores a categorical attribute", () => {
    visitMammals("&features=visibilitySlider")
    expectSliderUnchangedByDrop("Diet")
    expectSleepDropConfiguresSlider()
  })
})
