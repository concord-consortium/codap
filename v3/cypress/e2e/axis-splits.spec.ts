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
    // Single y-attribute: the full-height left axis fits a finer tick interval than the
    // split (two-y) cases above and below, so its first tick is "-0.5" rather than "0".
    ah.verifyAxisTickLabel("left", "-0.5", 0)

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
  // Splitting the plot by Diet repeats the Mammal axis once per diet, so each sub-axis is a fraction
  // of the length and must show fewer categories, still ending with OTHER. Removing or undoing the
  // split restores the unsplit set of categories.
  const verifyCategoriesLimitOnSplit = (axis: "left" | "bottom", split: "right" | "top",
                                        splitMenu: { open: string, list: string }) => {
    // A fresh graph from the toolbar is small enough that the 27 mammals overflow into OTHER.
    c.closeComponent("graph")
    c.getIconFromToolShelf("graph").click()
    cy.wait(500)

    ah.openAxisAttributeMenu(axis)
    ah.selectMenuAttribute("Mammal", axis)
    ae.getAxisTickLabels(axis, true).last().should("have.text", "OTHER")

    const subAxes = () => cy.get("[data-testid=graph]").find(`[data-testid=axis-${axis}]`).find(".sub-axis-wrapper")
    const verifyUnsplit = (unsplitCount: number) => {
      subAxes().should("have.length", 1)
      ae.getAxisTickLabels(axis, true).should("have.length", unsplitCount)
        .last().should("have.text", "OTHER")
    }
    const verifySplit = (unsplitCount: number) => {
      subAxes().should("have.length", 3).each(wrapper => {
        cy.wrap(wrapper).find("[data-testid=category-on-axis] [data-testid=category-label]")
          .should("have.length.lessThan", unsplitCount)
          .last().should("have.text", "OTHER")
      })
    }

    ae.getAxisTickLabels(axis, true).its("length").then(unsplitCount => {
      cy.dragAttributeToTarget("table", arrayOfAttributes[8], split) // Diet => split
      verifySplit(unsplitCount)

      ah.openAxisAttributeMenu(splitMenu.open)
      ah.removeAttributeFromAxis(arrayOfAttributes[8], splitMenu.list)
      verifyUnsplit(unsplitCount)

      toolbar.getUndoTool().click() // undo the removal
      verifySplit(unsplitCount)
      toolbar.getUndoTool().click() // undo adding the split
      verifyUnsplit(unsplitCount)
    })
  }
  it("keeps the OTHER category on each left sub-axis when split from the right", () => {
    verifyCategoriesLimitOnSplit("left", "right", { open: "rightCat", list: "right-cat" })
  })
  it("keeps the OTHER category on each bottom sub-axis when split from the top", () => {
    verifyCategoriesLimitOnSplit("bottom", "top", { open: "top", list: "top" })
  })

  const bottomSubAxes = () => cy.get("[data-testid=graph]").find("[data-testid=axis-bottom]").find(".sub-axis-wrapper")
  const subAxisLabels = (wrapper: JQuery<HTMLElement>) =>
    wrapper.find("[data-testid=category-on-axis] [data-testid=category-label]").toArray()
  // Every sub-axis shows the expected categories, left to right, with no two labels bunched together.
  const verifyBottomCategoryOrder = (expected: string[]) => {
    bottomSubAxes().should("have.length", 3).each(wrapper => {
      cy.wrap(wrapper).should($wrapper => {
        const labels = subAxisLabels($wrapper)
        expect(labels.map(label => label.textContent)).to.deep.equal(expected)
        const centers = labels.map(label => {
          const { left, width } = label.getBoundingClientRect()
          return left + width / 2
        })
        centers.slice(1).forEach((center, i) => {
          expect(center - centers[i], "spacing between adjacent labels").to.be.greaterThan(20)
        })
      })
    })
  }
  it("reorders the categories on every sub-axis when a label on one sub-axis is dragged", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("Diet", "bottom")
    cy.dragAttributeToTarget("table", arrayOfAttributes[7], "top") // Habitat => top split
    bottomSubAxes().should("have.length", 3)

    bottomSubAxes().first().then($wrapper => {
      const labels = subAxisLabels($wrapper)
      const original = labels.map(label => label.textContent ?? "")
      expect(original).to.have.length(3)
      const moved = [original[1], original[0], original[2]]
      verifyBottomCategoryOrder(original)

      // Drag the first category one band to the right, in small steps as a user would.
      const first = labels[0].getBoundingClientRect()
      const second = labels[1].getBoundingClientRect()
      const startX = first.left + first.width / 2
      const y = first.top + first.height / 2
      const distance = (second.left + second.width / 2) - startX
      const steps = 5
      cy.window().then(win => {
        cy.wrap(labels[0]).trigger("mousedown", { button: 0, clientX: startX, clientY: y, view: win, force: true })
        for (let i = 1; i <= steps; i++) {
          cy.get("body").trigger("mousemove", { clientX: startX + distance * i / steps, clientY: y, view: win,
                                                force: true })
        }
        cy.get("body").trigger("mouseup", { clientX: startX + distance, clientY: y, view: win, force: true })
      })
      verifyBottomCategoryOrder(moved)

      toolbar.getUndoTool().click()
      verifyBottomCategoryOrder(original)
      toolbar.getRedoTool().click()
      verifyBottomCategoryOrder(moved)
    })
  })

  it("updates the category limit of each sub-axis when a split graph is resized", () => {
    // A fresh graph from the toolbar is small enough that the 27 mammals overflow into OTHER.
    c.closeComponent("graph")
    c.getIconFromToolShelf("graph").click()
    cy.wait(500)
    ah.openAxisAttributeMenu("left")
    ah.selectMenuAttribute("Mammal", "left")
    cy.dragAttributeToTarget("table", arrayOfAttributes[8], "right") // Diet => split

    const leftSubAxes = () => cy.get("[data-testid=graph]").find("[data-testid=axis-left]").find(".sub-axis-wrapper")
    const verifyLabelCounts = (lengthAssertion: string, count: number) => {
      leftSubAxes().should("have.length", 3).each(wrapper => {
        cy.wrap(wrapper).find("[data-testid=category-on-axis] [data-testid=category-label]")
          .should(lengthAssertion, count)
          .last().should("have.text", "OTHER")
      })
    }

    leftSubAxes().should("have.length", 3).first()
      .find("[data-testid=category-on-axis] [data-testid=category-label]").its("length").then(initialCount => {
        verifyLabelCounts("have.length", initialCount)
        // Each arrow key press adds 20 pixels, so 6 presses add 40 pixels to each of the three sub-axes,
        // enough room for 3 more categories on each. Keyboard resizing commits to the model on blur.
        c.getComponentTitleBar("graph").trigger("click", { force: true })
        c.getResizeControl("graph").focus().type("{downarrow}".repeat(6)).blur()
        verifyLabelCounts("have.length.greaterThan", initialCount)

        c.getResizeControl("graph").focus().type("{uparrow}".repeat(6)).blur()
        verifyLabelCounts("have.length", initialCount)
      })
  })
})
