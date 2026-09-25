import { ComponentElements as c } from "../support/elements/component-elements"
import { SliderTileElements as slider } from "../support/elements/slider-tile"

// the Mammals dashboard already contains a variable slider ("v1"), which these tests drop onto
const baseParams = "?sample=mammals&dashboard&mouseSensor&suppressUnsavedWarning"

function expectSliderUnchangedByDrop(attribute: string) {
  c.getComponentTitle("slider").invoke("text").then(title => {
    slider.getVariableValue().then(value => {
      cy.dragAttributeToTarget("table", attribute, "slider")
      c.getComponentTitle("slider").should("have.text", title)
      slider.getVariableValue().should("eq", value)
    })
  })
}

context("Slider configured from an attribute", () => {
  it("becomes a visibility slider titled for the childmost collection when a numeric attribute is dropped", () => {
    cy.visit(`${Cypress.config("index")}${baseParams}&features=visibilitySlider`)
    cy.wait(2500)
    c.getComponentTitle("slider").should("not.have.text", "Cases")
    cy.dragAttributeToTarget("table", "Sleep", "slider")
    // the Mammals dataset's (only) collection is "Cases"
    c.getComponentTitle("slider").should("have.text", "Cases")
    // the range starts at Sleep's minimum, and a range slider shows its range in place of the variable's value
    slider.getSliderTile().find('[data-testid="slider-range-values"] .range-text')
      .invoke("text").should("match", /^2 - /)
  })

  it("ignores the drop when the flag is off", () => {
    cy.visit(`${Cypress.config("index")}${baseParams}`)
    cy.wait(2500)
    expectSliderUnchangedByDrop("Sleep")
  })

  it("leaves the slider unselected when a drop is ignored", () => {
    cy.visit(`${Cypress.config("index")}${baseParams}`)
    cy.wait(2500)
    c.selectTile("table", 0)
    c.checkComponentFocused("slider", false)
    cy.dragAttributeToTarget("table", "Sleep", "slider")
    c.checkComponentFocused("slider", false)
  })

  // Drop collision detection prefers the tile painted under the pointer, found by testing whether a
  // droppable contains the element there, so the slider's droppable must contain its painted content.
  it("has a drop target that contains what is painted over it", () => {
    cy.visit(`${Cypress.config("index")}${baseParams}&features=visibilitySlider`)
    cy.wait(2500)
    cy.get('[data-testid="slider-attribute-drop"]').first().then($drop => {
      const drop = $drop[0]
      const rect = drop.getBoundingClientRect()
      const topElt = drop.ownerDocument.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
      expect(drop.contains(topElt)).to.equal(true)
    })
  })

  it("ignores a categorical attribute", () => {
    cy.visit(`${Cypress.config("index")}${baseParams}&features=visibilitySlider`)
    cy.wait(2500)
    expectSliderUnchangedByDrop("Diet")
  })
})
