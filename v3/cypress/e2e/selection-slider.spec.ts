import { ComponentElements as c } from "../support/elements/component-elements"
import { SliderTileElements as slider } from "../support/elements/slider-tile"
import { TableTileElements as table } from "../support/elements/table-tile"

const params = "?sample=mammals&dashboard&mouseSensor&suppressUnsavedWarning&features=visibilitySlider,selectionSlider"

// Sleep ranges over [2, 20] in the Mammals sample, so the configured range starts at [2, 3.8]
function setupSelectionSlider() {
  cy.visit(`${Cypress.config("index")}${params}`)
  cy.get('.codap-case-table [data-testid="codap-attribute-button Sleep"]').should("be.visible")
  slider.getVariableValue().should("eq", "0.5")
  cy.dragAttributeToTarget("table", "Sleep", "slider")
  slider.getRangeLowInput().should("have.value", "2")
  // switch to a Selection slider in the inspector's Configuration palette, then close the palette, which can cover
  // the slider
  c.selectTile("slider", 0)
  c.getInspectorPanel().find("[data-testid=slider-config-button]").click()
  cy.get("[data-testid=slider-type-button]").click()
  cy.get("[data-testid=slider-type-selection]").click()
  c.getInspectorPanel().find("[data-testid=slider-config-button]").click()
  cy.get("[data-testid=slider-type-button]").should("not.exist")
}

const pressRangeBody = () => {
  const pointer = { eventConstructor: "PointerEvent", pointerId: 1, pointerType: "mouse", isPrimary: true, force: true }
  slider.getRangeBody().trigger("pointerdown", { ...pointer, button: 0, buttons: 1 })
  slider.getRangeBody().trigger("pointerup", { ...pointer, button: 0, buttons: 0 })
}

context("Selection slider", () => {
  it("pauses for a selection made elsewhere and resumes when touched", () => {
    setupSelectionSlider()
    // choosing the Selection type selects the cases in range
    table.getSelectedRows().its("length").should("be.gt", 0)
    cy.get("[data-testid=slider-selection-paused-badge]").should("not.exist")

    // selecting a row in the table takes over: the slider pauses and leaves that selection alone
    table.getGridCell(2, 2).click()
    cy.get("[data-testid=slider-selection-paused-badge]").should("be.visible").and("have.text", "Paused")
    table.getSelectedRows().should("have.length", 1)

    // touching the slider resumes it, re-selecting its range
    pressRangeBody()
    cy.get("[data-testid=slider-selection-paused-badge]").should("not.exist")
    table.getSelectedRows().its("length").should("be.gt", 0)
  })
})
