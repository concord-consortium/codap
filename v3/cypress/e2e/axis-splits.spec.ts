import { AxisHelper as ah } from "../support/helpers/axis-helper"
import { ComponentElements as c } from "../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { AxisElements as ae } from "../support/elements/axis-elements"

let arrayOfAttributes: string[]

context("Test graph axes with split, multi-y, bars, and overflow configurations", () => {
  beforeEach(() => {
    cy.fixture('axis-test-data.json').then((data) => {
      arrayOfAttributes = data.attributes
    })
    const queryParams = "?sample=mammals&dashboard&mouseSensor&suppressUnsavedWarning"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(1000)
  })
  it("will split an axis into identical sub axes when categorical attribute is on opposite split", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("Mass", "bottom") // Mass => x-axis
    cy.get("[data-testid=graph]").find("[data-testid=axis-bottom]").find(".sub-axis-wrapper").should("have.length", 1)
    cy.dragAttributeToTarget("table", arrayOfAttributes[7], "top") // Habitat => top split
    cy.get("[data-testid=graph]").find("[data-testid=axis-bottom]").find(".sub-axis-wrapper").should("have.length", 3)
    cy.get("[data-testid=graph]").find("[data-testid=axis-bottom]").find(".sub-axis-wrapper").each((wrapper) => {
      cy.wrap(wrapper).find(".tick").should("have.length", 4)
    })
    cy.get("[data-testid=graph]").find("[data-testid=axis-bottom]").find(".sub-axis-wrapper").each((wrapper) => {
      cy.wrap(wrapper).find(".tick").each((tick, index) => {
        const value = index * 2000
        cy.wrap(tick).invoke("text").should("eq", value.toString())
      })
    })
    ah.openAxisAttributeMenu("top")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "top")
    cy.get("[data-testid=graph]").find("[data-testid=axis-bottom]").find(".sub-axis-wrapper").should("have.length", 1)
  })
  it("will create a graph with categorical x-axis, categorical right-axis, and numerical y-axis", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("Diet", "bottom") // Diet => bottom
    cy.get("[data-testid=graph]").find("[data-testid=axis-bottom]").find(".sub-axis-wrapper").should("have.length", 1)
    cy.dragAttributeToTarget("table", arrayOfAttributes[4], "left") // Mass => y axis
    cy.get("[data-testid=graph]").find("[data-testid=axis-left]").find(".sub-axis-wrapper").should("have.length", 1)
    cy.dragAttributeToTarget("table", arrayOfAttributes[7], "right") // Habitat => right axis
    cy.get("[data-testid=graph]").find("[data-testid=axis-rightCat]").find(".sub-axis-wrapper").should("have.length", 1)
    cy.get("[data-testid=graph]").find("[data-testid=axis-left]").find(".sub-axis-wrapper").should("have.length", 3)
  })
  it("will test graph with numeric x-axis and two numeric y-attributes", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("LifeSpan", "bottom") // LifeSpan => x-axis
    cy.get("[data-testid=graph]").find("[data-testid=axis-bottom]").find(".sub-axis-wrapper").should("have.length", 1)
    cy.dragAttributeToTarget("table", arrayOfAttributes[3], "left") // Height => left split
    cy.dragAttributeToTarget("table", arrayOfAttributes[5], "yplus") // Sleep => left split

    // checks for multiple y-axis labels
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyYAxisTickMarksDisplayed()
    // With multiple y-attributes, each gets its own separate label
    cy.get("[data-testid=graph]").find(".axis-wrapper.bottom [data-testid=attribute-label]")
      .should("have.text", "LifeSpan")
    cy.get("[data-testid=graph]").find("[data-testid=attribute-label-multi-y]").should("have.length", 2)
    cy.get("[data-testid=graph]").find("[data-testid=attribute-label-multi-y]").eq(0).should("have.text", "Height")
    cy.get("[data-testid=graph]").find("[data-testid=attribute-label-multi-y]").eq(1).should("have.text", "Sleep")
    ah.verifyAxisTickLabel("left", "0", 0)
    cy.get("[data-testid=graph]")
      .find("[data-testid=axis-bottom]")
      .find(".sub-axis-wrapper")
      .should("have.length", 1)

    // Undo the last change (Sleep => left split)
    cy.log("test for undo/redo graph with numeric x-axis and two numeric y-attributes")
    toolbar.getUndoTool().click()
    cy.wait(500)
    // After undo, only one y-attribute remains, so it uses the standard attribute-label
    cy.get("[data-testid=graph]").find(".axis-wrapper.bottom [data-testid=attribute-label]")
      .should("have.text", "LifeSpan")
    cy.get("[data-testid=graph]").find(".axis-wrapper.left [data-testid=attribute-label]")
      .should("have.text", "Height")
    cy.get("[data-testid=graph]").find("[data-testid=attribute-label-multi-y]").should("have.length", 0)
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyAxisTickLabel("left", "0", 0)

    // Redo the last change (Sleep => left split)
    toolbar.getRedoTool().click()
    cy.wait(500)
    // After redo, multiple y-attributes restored, each gets its own label
    cy.get("[data-testid=graph]").find(".axis-wrapper.bottom [data-testid=attribute-label]")
      .should("have.text", "LifeSpan")
    cy.get("[data-testid=graph]").find("[data-testid=attribute-label-multi-y]").should("have.length", 2)
    cy.get("[data-testid=graph]").find("[data-testid=attribute-label-multi-y]").eq(0).should("have.text", "Height")
    cy.get("[data-testid=graph]").find("[data-testid=attribute-label-multi-y]").eq(1).should("have.text", "Sleep")
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyAxisTickLabel("left", "0", 0)

    // Verify the state after undo/redo
    ah.verifyXAxisTickMarksDisplayed()
    cy.get("[data-testid=graph]")
      .find("[data-testid=axis-bottom]")
      .find(".sub-axis-wrapper")
      .should("have.length", 1)

    cy.log("check that numeric axis labels are unique and visible")
    ae.getAxisTickLabels("bottom", false).then($labels => {
      const labelTexts = [...$labels].map(el => el.textContent?.trim())
      // Uniqueness
      const uniqueLabels = new Set(labelTexts)
      expect(uniqueLabels.size).to.equal(labelTexts.length)
      // Visibility
      ;[...$labels].forEach(el => {
        const style = window.getComputedStyle(el)
        expect(style.display).to.not.equal("none")
        expect(style.visibility).to.not.equal("hidden")
        expect(el.getAttribute("opacity")).to.not.equal("0")
      })
    })
  })
  it("will adjust axis domain when points are changed to bars with undo/redo", () => {
    // When there are no negative numeric values, such as in the case of Height, the domain for the primary
    // axis of a univariate plot showing bars should start at zero.
    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("Height", "bottom") // Height => x-axis
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyAxisTickLabel("bottom", "−0.5", 0)

    // Changing to bars and verifying axis adjustment
    cy.get("[data-testid=graph-display-config-button]").click()
    cy.get("[data-testid=bars-radio-button]").click()
    ah.verifyAxisTickLabel("bottom", "0", 0)

    // Undo the change to bars (expect to revert to points)
    cy.log("test undo/redo for adjust axis domain when points are changed to bars")
    toolbar.getUndoTool().click()

    // Verify the axis label reverts to the initial state for points
    ah.verifyAxisTickLabel("bottom", "−0.5", 0)

    // Redo the change to bars
    toolbar.getRedoTool().click()

    // Verify the axis label adjusts correctly for bars again
    ah.verifyAxisTickLabel("bottom", "0", 0)

    // Switch back to points without undo/redo to clean up state
    cy.get("[data-testid=graph-display-config-button]").click()
    cy.get("[data-testid=points-radio-button]").click()
    ah.verifyAxisTickLabel("bottom", "-0.5", 0)
  })
  it("places dots in the OTHER bucket when a categorical axis overflows (CODAP-1260)", () => {
    // Mammal has one unique value per case (~27 mammals). The dashboard's default
    // graph is wide enough that all 27 categories fit (limit = axisLength / 12).
    // Close it and create a fresh graph from the toolbar — its default size is
    // narrow enough that 27 mammals overflow into OTHER.
    c.closeComponent("graph")
    c.getIconFromToolShelf("graph").click()
    cy.wait(500)

    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("Mammal", "bottom")
    cy.wait(1000)

    // Overflow happened: the localized "OTHER" label appears as the rightmost tick.
    ah.verifyAxisTickLabels("bottom", ["OTHER"], true)

    // Before the fix, the OTHER bucket cases bucketed to x ≈ pointDiameter/2 (the
    // left edge) because the band scale's domain held the localized "OTHER" while
    // dot bucketing looked up the kOther sentinel — the lookup missed and fell
    // back to 0. After the fix, those cases land at the OTHER band center, which
    // is the *rightmost* band on the axis.
    //
    // The OTHER bucket holds more cases than any single visible category (overflow
    // is by definition the larger residue). All those cases get the same x (their
    // band center), so the largest cluster of dots indicates where OTHER is. With
    // the bug it's at the left edge; with the fix it's at the right edge.
    cy.get('[data-testid=codap-graph]').parents('.free-tile-component')
      .invoke('attr', 'id').then((id) => {
        const tileId = String(id)
        cy.window().then((win: any) => {
          const pixiPoints = win.rendererArrayMap?.[tileId]
          chai.assert.exists(pixiPoints, "rendererArrayMap entry for graph tile exists")
          chai.assert.exists(pixiPoints[0], "graph has at least one renderer")
          const xs: number[] = pixiPoints[0].points.map((p: any) => p.position.x)
          expect(xs.length, 'graph has rendered points').to.be.greaterThan(0)
          const buckets = new Map<number, number>()
          xs.forEach((x: number) => {
            const b = Math.round(x / 3) * 3
            buckets.set(b, (buckets.get(b) ?? 0) + 1)
          })
          let maxCount = 0
          let largestClusterX = 0
          buckets.forEach((count, x) => {
            if (count > maxCount) { maxCount = count; largestClusterX = x }
          })
          const midpoint = (Math.min(...xs) + Math.max(...xs)) / 2
          expect(largestClusterX, 'OTHER bucket cluster is in the right half of the axis')
            .to.be.greaterThan(midpoint)
        })
      })
  })
})
