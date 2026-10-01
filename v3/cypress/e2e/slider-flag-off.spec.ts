import { CfmElements as cfm } from "../support/elements/cfm"
import { ComponentElements as c } from "../support/elements/component-elements"
import { SliderTileElements as slider } from "../support/elements/slider-tile"

// A visibility slider authored with the flag on, opened with it off: the flag gates only creating and
// rebinding range sliders, so the saved slider keeps working, and closing it restores the cases.
// The fixture is the Mammals sample with its slider bound to Sleep over [8, 12] (9 cases shown, 18 hidden).
context("Visibility slider with its feature flag off", () => {
  const collectionTitle = () => cy.get(".codap-case-table .collection-title-preview")
  // the "(N cases, M hidden)" counts in the table's collection title
  const parseCounts = (text: string) => {
    const [, shown, hidden] = text.match(/\((\d+) cases?, (\d+) hidden\)/) ?? []
    return { shown: Number(shown), hidden: Number(hidden) }
  }

  beforeEach(() => {
    // forced off, whatever the server's feature-flag config says
    cy.visit(`${Cypress.config("index")}?mouseSensor&suppressUnsavedWarning&features=-visibilitySlider`)
    // dropped on the startup dialog that a visit without a document shows, once it's up
    cy.contains("button", "Create New Document").should("be.visible")
    cfm.openLocalDocWithUserEntry("cypress/fixtures/visibility-slider.codap3")
  })

  // also confirms the flag is off: with it on, the drop would rebind the slider to LifeSpan
  it("can't be rebound to another attribute", () => {
    slider.getSliderTile().find('[data-testid="slider-attribute-label"]').should("have.text", "Sleep")
    cy.dragAttributeToTarget("table", "LifeSpan", "slider")
    // asserting that nothing happened, so give a (wrong) rebinding time to render before checking
    cy.wait(500)
    slider.getSliderTile().find('[data-testid="slider-attribute-label"]').should("have.text", "Sleep")
  })

  it("still hides the cases outside the saved range", () => {
    collectionTitle().should($title => {
      expect(parseCounts($title.text())).to.deep.equal({ shown: 9, hidden: 18 })
    })
  })

  it("still changes which cases are hidden when the range is dragged", () => {
    collectionTitle().should("contain.text", "9 cases")
    slider.getRangeBody().then($body => {
      const rect = $body[0].getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      const pointer = { eventConstructor: "PointerEvent", pointerId: 1, pointerType: "mouse", isPrimary: true,
                        button: 0, force: true, clientY: y }
      cy.wrap($body).trigger("pointerdown", { ...pointer, buttons: 1, clientX: x })
      cy.wrap($body).trigger("pointermove", { ...pointer, buttons: 1, clientX: x + 120 })
      cy.wrap($body).trigger("pointerup", { ...pointer, buttons: 0, clientX: x + 120 })
    })
    collectionTitle().should($title => {
      const { shown, hidden } = parseCounts($title.text())
      expect(shown + hidden).to.equal(27)
      expect(shown).not.to.equal(9)
    })
  })

  it("restores the cases when the slider is closed", () => {
    collectionTitle().should("contain.text", "9 cases")
    c.closeComponent("slider")
    cy.get(".codap-case-table").contains("(27 cases)")
  })
})
