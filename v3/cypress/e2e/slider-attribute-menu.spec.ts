import { ComponentElements as c } from "../support/elements/component-elements"
import { SliderTileElements as slider } from "../support/elements/slider-tile"

// the Mammals dashboard already contains a variable slider ("v1")
const params = "?sample=mammals&dashboard&mouseSensor&suppressUnsavedWarning&features=visibilitySlider"

function visitMammals() {
  cy.visit(`${Cypress.config("index")}${params}`)
  cy.get('.codap-case-table [data-testid="codap-attribute-button Sleep"]').should("be.visible")
  slider.getVariableValue().should("eq", "0.5")
}

// switches the slider to a Visibility slider in the inspector's Configuration palette, then closes the palette,
// which can cover the slider
function makeVisibilitySlider() {
  c.selectTile("slider", 0)
  c.getInspectorPanel().find("[data-testid=slider-config-button]").click()
  cy.get("[data-testid=slider-type-button]").click()
  cy.get("[data-testid=slider-type-visibility]").click()
  c.getInspectorPanel().find("[data-testid=slider-config-button]").click()
  cy.get("[data-testid=slider-type-button]").should("not.exist")
}

// The menu portals out of the tile, so it must be stacked above the tiles: the item must be what's painted at its
// own center (an item hidden under a tile would still pass a forced click).
function expectMenuItemOnTop(name: string) {
  cy.get('[data-testid="slider-attribute-menu-list"] [role="menuitem"]').contains(name).then($item => {
    const item = $item[0]
    const rect = item.getBoundingClientRect()
    const topElt = item.ownerDocument.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    expect(item.contains(topElt)).to.equal(true)
  })
}

function chooseFromMenu(name: string) {
  expectMenuItemOnTop(name)
  cy.get('[data-testid="slider-attribute-menu-list"] [role="menuitem"]').contains(name).click()
}

context("Slider attribute menu", () => {
  it("prompts an empty Visibility slider for an attribute and configures it from the menu", () => {
    visitMammals()
    makeVisibilitySlider()
    c.getComponentTitle("slider").should("have.text", "Visibility Slider")
    slider.getSliderTile().find("[data-testid=slider-attribute-prompt]")
      .should("contain.text", "Drag an attribute or click here")
    slider.getSliderTile().find("[data-testid=slider-axis]").should("not.exist")

    slider.getSliderTile().find("[data-testid=slider-attribute-menu-button]").click()
    // only numeric and date attributes are offered
    cy.get('[data-testid="slider-attribute-menu-list"]').should("not.contain.text", "Diet")
    chooseFromMenu("Sleep")
    cy.focused().should("have.attr", "data-testid", "slider-attribute-menu-button")
      .parents("[data-testid=slider-attribute-label]").should("exist")

    // the Mammals dataset's (only) collection is "Cases"
    c.getComponentTitle("slider").should("have.text", "Cases")
    slider.getSliderTile().find("[data-testid=slider-axis]").should("exist")
    slider.getSliderTile().find("[data-testid=slider-attribute-label]").should("contain.text", "Sleep")
  })

  it("switches a configured slider's attribute from the menu under its axis", () => {
    visitMammals()
    cy.dragAttributeToTarget("table", "Sleep", "slider")
    slider.getSliderTile().find("[data-testid=slider-attribute-label]").should("contain.text", "Sleep")

    slider.getSliderTile().find("[data-testid=slider-attribute-label] [data-testid=slider-attribute-menu-button]")
      .click()
    chooseFromMenu("Mass")

    slider.getSliderTile().find("[data-testid=slider-attribute-label]").should("contain.text", "Mass")
  })

  it("shows its menu's caret only while the slider is selected, as a graph's axis label does", () => {
    visitMammals()
    makeVisibilitySlider()
    const caretFill = () => slider.getSliderTile()
      .find("[data-testid=slider-attribute-menu-button] .attribute-label-arrow path")
      .then($path => getComputedStyle($path[0]).fill)
    // selecting the table deselects the slider
    c.selectTile("table", 0)
    caretFill().should("eq", "rgba(0, 0, 0, 0)")
    c.selectTile("slider", 0)
    caretFill().should("eq", "rgb(0, 108, 142)")
  })

  it("keeps the prompt's caret on the line of its text", () => {
    visitMammals()
    makeVisibilitySlider()
    slider.getSliderTile().find("[data-testid=slider-attribute-menu-button]").then($button => {
      const text = $button[0].querySelector(".slider-attribute-menu-text")!.getBoundingClientRect()
      const caret = $button[0].querySelector(".attribute-label-arrow")!.getBoundingClientRect()
      const caretMiddle = (caret.top + caret.bottom) / 2
      expect(caretMiddle).to.be.within(text.top, text.bottom)
      expect(caret.left).to.be.at.least(text.right - 1)
    })
  })
})

