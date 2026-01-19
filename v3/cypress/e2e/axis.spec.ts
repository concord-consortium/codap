import { AxisHelper as ah } from "../support/helpers/axis-helper"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { AxisElements as ae } from "../support/elements/axis-elements"

let arrayOfAttributes: string[]
let arrayOfValues: Array<{attribute: string, values: string[]}>

context("Test graph axes with various attribute types", () => {
  beforeEach(() => {
    cy.fixture('axis-test-data.json').then((data) => {
      arrayOfAttributes = data.attributes
      arrayOfValues = data.values
    })
    const queryParams = "?sample=mammals&dashboard&mouseSensor&suppressUnsavedWarning"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(1000)
  })
  it("will show default x axis label", () => {
    ah.verifyDefaultAxisLabel("bottom")
    ah.verifyDefaultAxisLabel("left")
  })
  it("will add categorical attribute to x axis with undo/redo", () => {
    // Adding the attribute
    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("Habitat", "bottom") // Habitat => x-axis
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed(true)
    ah.verifyXAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("bottom", arrayOfValues[7].values, true)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "bottom")

    // Undo adding the attribute
    cy.log("test undo/redo of add categorical attribute to x axis")
    // undo removal of attribute _and_ dropping of attribute
    toolbar.getUndoTool().dblclick()
    // Verify the attribute was removed
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")

    // Redo adding the attribute
    toolbar.getRedoTool().click()
    // Verify the attribute was removed
    ah.verifyAxisTickLabels("bottom", arrayOfValues[7].values, true)
  })
  it("will add numeric attribute to x axis with undo/redo", () => {
    // Adding the attribute
    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("LifeSpan", "bottom") // LifeSpan => x-axis
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyXAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[2].values)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "bottom")

    // Undo adding the attribute
    cy.log("test undo/redo of add numeric attribute to x axis")
    // undo removal of attribute _and_ dropping of attribute
    toolbar.getUndoTool().dblclick()
    // Verify the attribute was added back
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")

    // Redo adding the attribute
    toolbar.getRedoTool().click()
    // Verify the attribute was removed
    ah.verifyAxisTickLabels("bottom", arrayOfValues[2].values)
  })
  it("will add categorical attribute to y axis with undo/redo", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[8], "left") // Diet => y-axis
    cy.wait(500)  // Wait for axis tick marks to render after drag
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("left", arrayOfValues[8].values, true)
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[8], "left")

    cy.log("test undo/redo of add categorical attribute to y axis")
    // undo removal of attribute _and_ dropping of attribute
    toolbar.getUndoTool().dblclick()
    cy.wait(500)  // Wait for graph to re-render after undo
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")

    // redo dropping of attribute _and_ removal of attribute
    toolbar.getRedoTool().dblclick()
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
  })
  it("will add numeric attribute to y axis with undo/redo", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[5], "left") // Sleep => y-axis
    cy.wait(1000)  // Wait for axis tick marks to render after drag
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyYAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("left", arrayOfValues[5].values)
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[5], "left")

    // Undo the last change (remove attribute from bottom axis)
    cy.log("test undo/redo of add numeric attribute to y axis")
    // undo removal of attribute _and_ dropping of attribute
    toolbar.getUndoTool().dblclick()
    cy.wait(500)  // Wait for graph to re-render after undo
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")

    // redo dropping of attribute _and_ removal of attribute
    toolbar.getRedoTool().dblclick()
    cy.wait(500)  // Wait for graph to re-render after redo
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
  })
  it("will add categorical attribute to x axis and categorical attribute to y axis with undo/redo", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("Habitat", "bottom") // Habitat => x-axis
    cy.dragAttributeToTarget("table", arrayOfAttributes[8], "left") // Diet => y-axis
    ah.verifyXAxisTickMarksDisplayed(true)
    ah.verifyXAxisGridLinesDisplayed(true)
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("bottom", arrayOfValues[7].values, true)
    ah.verifyAxisTickLabels("left", arrayOfValues[8].values, true)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "bottom")
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("left", arrayOfValues[8].values, true)
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[8], "left")

    // Undo the last change (remove attribute from bottom axis)
    cy.log("test undo/redo of add categorical attribute to x axis and categorical attribute to y axis")
    // undo removal of attribute _and_ dropping of attribute
    toolbar.getUndoTool().dblclick()
    ah.verifyXAxisTickMarksDisplayed(true)
    ah.verifyXAxisGridLinesDisplayed(true)
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("bottom", arrayOfValues[7].values, true)
    ah.verifyAxisTickLabels("left", arrayOfValues[8].values, true)

    // redo dropping of attribute _and_ removal of attribute
    toolbar.getRedoTool().dblclick()
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
  })
  it("will add categorical attribute to x axis and numeric attribute to y axis with undo/redo", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("Habitat", "bottom") // Habitat => x-axis
    cy.dragAttributeToTarget("table", arrayOfAttributes[5], "left") // Sleep => y-axis
    ah.verifyXAxisTickMarksDisplayed(true)
    ah.verifyXAxisGridLinesDisplayed(true)
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyYAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[7].values, true)
    ah.verifyAxisTickLabels("left", arrayOfValues[5].values)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "bottom")
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyYAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("left", arrayOfValues[5].values)
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[5], "left")

    cy.log("test undo/redo of add categorical attribute to x axis and numeric attribute to y axis")
    // undo removal of attribute _and_ dropping of attribute
    toolbar.getUndoTool().dblclick()
    ah.verifyXAxisTickMarksDisplayed(true)
    ah.verifyXAxisGridLinesDisplayed(true)
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyYAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[7].values, true)
    ah.verifyAxisTickLabels("left", arrayOfValues[5].values)

    // redo dropping of attribute _and_ removal of attribute
    toolbar.getRedoTool().dblclick()
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
  })
  it("will add numeric attribute to x axis and categorical attribute to y axis with undo/redo", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("Height", "bottom") // Height => x-axis
    cy.dragAttributeToTarget("table", arrayOfAttributes[7], "left") // Habitat => y-axis
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyXAxisGridLinesNotDisplayed()
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)
    ah.verifyAxisTickLabels("left", arrayOfValues[7].values, true)
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "left")
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyXAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[3], "bottom")

    cy.log("test undo/redo of add numeric attribute to x axis and categorical attribute to y axis")
    // undo removal of attribute _and_ dropping of attribute
    toolbar.getUndoTool().dblclick()
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyXAxisGridLinesNotDisplayed()
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)
    ah.verifyAxisTickLabels("left", arrayOfValues[7].values, true)
    ah.openAxisAttributeMenu("left")

    // redo dropping of attribute _and_ removal of attribute
    toolbar.getRedoTool().dblclick()
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
  })
  it("will add numeric attribute to x axis and numeric attribute to y axis with undo/redo", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("Height", "bottom") // Height => x-axis
    cy.dragAttributeToTarget("table", arrayOfAttributes[4], "left") // Mass => y-axis
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)
    ah.verifyAxisTickLabels("left", arrayOfValues[4].values)
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[4], "left")
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyXAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[3], "bottom")

    cy.log("test undo/redo of add numeric attribute to x axis and categorical attribute to y axis")
    // undo removal of attribute _and_ dropping of attribute
    toolbar.getUndoTool().dblclick()
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)
    ah.verifyAxisTickLabels("left", arrayOfValues[4].values)

    // redo dropping of attribute _and_ removal of attribute
    toolbar.getRedoTool().dblclick()
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
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
    cy.get("[data-testid=graph]").find("[data-testid=attribute-label]").should("have.text", "LifeSpanHeight, Sleep")
    ah.verifyAxisTickLabel("left", "0", 0)
    cy.get("[data-testid=graph]")
      .find("[data-testid=axis-bottom]")
      .find(".sub-axis-wrapper")
      .should("have.length", 1)

    // Undo the last change (Sleep => left split)
    cy.log("test for undo/redo graph with numeric x-axis and two numeric y-attributes")
    toolbar.getUndoTool().click()
    cy.wait(500)
    cy.get("[data-testid=graph]")
      .find("[data-testid=attribute-label]")
      .should("have.text", "LifeSpanHeight")
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyAxisTickLabel("left", "0", 0)

    // Redo the last change (Sleep => left split)
    toolbar.getRedoTool().click()
    cy.wait(500)
    cy.get("[data-testid=graph]")
      .find("[data-testid=attribute-label]")
      .should("have.text", "LifeSpanHeight, Sleep")
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
    cy.get("[data-testid=graph-display-config-button").click()
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
    cy.get("[data-testid=graph-display-config-button").click()
    cy.get("[data-testid=points-radio-button]").click()
    ah.verifyAxisTickLabel("bottom", "-0.5", 0)
  })
})

context("Test graph axes attribute menu", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&mouseSensor&suppressUnsavedWarning"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })
  it("will open and close x axis attribute menu when clicked on default axis label", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.verifyRemoveAttributeDoesNotExist("bottom")
    ah.verifyTreatAsOptionDoesNotExist("bottom")
    ah.openAxisAttributeMenu("bottom")
    ah.verifyAxisMenuIsClosed("bottom")
  })
  it("will open and close y axis attribute menu when clicked on default axis label", () => {
    ah.openAxisAttributeMenu("left")
    ah.verifyRemoveAttributeDoesNotExist("left")
    ah.verifyTreatAsOptionDoesNotExist("left")
    ah.openAxisAttributeMenu("left")
    ah.verifyAxisMenuIsClosed("left")
  })
  it("will add and remove categorical attribute to x axis from attribute menu with undo/redo", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.addAttributeToAxis(arrayOfAttributes[7], "bottom") // Habitat => x-axis
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed(true)
    ah.verifyXAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("bottom", arrayOfValues[7].values, true)

    // Undo the addition of the categorical attribute
    // Used force:true because Cypress fails locally at this step
    toolbar.getUndoTool().click({force:true})

    // Verify the x-axis reverts to its default state after undoing the attribute addition
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")

    // Redo the addition of the categorical attribute
    toolbar.getRedoTool().click()

    // Verify the x-axis reflects the re-addition of the categorical attribute
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed(true)
    ah.verifyXAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("bottom", arrayOfValues[7].values, true)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "bottom")
  })
  it("will add and remove numeric attribute to x axis from attribute menu with undo/redo", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.addAttributeToAxis(arrayOfAttributes[3], "bottom") // Height => x-axis
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyXAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)

    // Perform an undo action to revert the addition of the numeric attribute
    cy.log("test undo/redo for add and remove numeric attribute to axis from attribute menu")
    toolbar.getUndoTool().click()

    // Verify the x-axis reverts to its default state after undoing the attribute addition
    ah.verifyDefaultAxisLabel("bottom")

    // Perform a redo action to reapply the addition of the numeric attribute
    toolbar.getRedoTool().click()

    // Verify the x-axis reflects the re-addition of the numeric attribute
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyXAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)

    // Clean up by removing the attribute
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[3], "bottom")
  })
  it("will add and remove categorical attribute to y axis from attribute menu with undo/redo", () => {
    ah.openAxisAttributeMenu("left")
    ah.addAttributeToAxis(arrayOfAttributes[7], "left") // Habitat => y-axis
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("left", arrayOfValues[7].values, true)

    // Undo the addition of the categorical attribute
    cy.log("test undo/redo for add/remove categorical attribute to y axis from attribute menu")
    toolbar.getUndoTool().click()

    // Verify the y-axis reverts to its default state after undoing the attribute addition
    ah.verifyDefaultAxisLabel("left")

    // Redo the addition of the categorical attribute
    toolbar.getRedoTool().click()

    // Verify the y-axis reflects the re-addition of the categorical attribute
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("left", arrayOfValues[7].values, true)

    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "left")
  })
  it("will add and remove numeric attribute to y axis from attribute menu with undo/redo", () => {
    ah.openAxisAttributeMenu("left")
    ah.addAttributeToAxis(arrayOfAttributes[4], "left") // Mass => y-axis
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyYAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("left", arrayOfValues[4].values)

    // Undo the addition of the numeric attribute
    cy.log("test undo/redo add and remove numeric attribute to y axis from attribute menu")
    toolbar.getUndoTool().click()

    // Verify the y-axis reverts to its default state after undoing the attribute addition
    ah.verifyDefaultAxisLabel("left")

    // Redo the addition of the numeric attribute
    toolbar.getRedoTool().click()

    // Verify the y-axis reflects the re-addition of the numeric attribute
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyYAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("left", arrayOfValues[4].values)

    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[4], "left")
  })
  it("will treat numeric attribute on x axis to categorical", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.addAttributeToAxis(arrayOfAttributes[3], "bottom") // Height => x-axis
    ah.openAxisAttributeMenu("bottom")
    ah.treatAttributeAsCategorical("bottom")
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed(true)
    ah.verifyXAxisGridLinesDisplayed(true)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[3], "bottom")
  })
  it("will treat numeric attribute on y axis to categorical", () => {
    ah.openAxisAttributeMenu("left")
    ah.addAttributeToAxis(arrayOfAttributes[3], "left")
    ah.openAxisAttributeMenu("left")
    ah.treatAttributeAsCategorical("left")
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[3], "left")
  })
})

context("Test date axes with multiple y-axes", () => {
  let fourSealsValues: Array<{attribute: string, values: string[]}>

  beforeEach(() => {
    cy.fixture('axis-test-data.json').then((data) => {
      fourSealsValues = data.fourSeals.values
    })
    const queryParams = "?mouseSensor=&suppressUnsavedWarning#file=examples:Four%20Seals"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(1000)
  })

  it("will create a time series graph with multiple y-axes using date x-axis", () => {
    // Create graph with date on x-axis and chlorophyll on y-axis
    ah.openAxisAttributeMenu("bottom")
    ah.selectSubmenuAttribute("date", "Measurements", "bottom")
    cy.dragAttributeToTarget("table", "chlorophyll", "left")

    // Verify initial graph setup
    // For date axis, check all expected labels are present, regardless of order
    ae.getDateAxisTickLabels("bottom").then($labels => {
      const labelTexts = [...$labels].map(el => el.textContent?.trim())
      expect(labelTexts).to.include.members(fourSealsValues[0].values)
    })
    ah.verifyAxisTickLabels("left", fourSealsValues[1].values)

    // Add temperature to second y-axis
    cy.dragAttributeToTarget("table", "temperature", "yplus")

    // Verify multiple y-axes
    cy.get("[data-testid=graph]").find("[data-testid=attribute-label]").invoke("text")
      .should("contain", "datechlorophyll, temperature")

    // Explicitly check for the year label on the x-axis
    cy.get('[data-testid="axis-bottom"]').find('text').contains('2005').should('exist')

    // Loosen the assertion for y-axis tick labels
    ah.verifyAxisTickLabelsInclude("left", ["0", "4"])
    ae.getAxisTickLabels("left").then($labels => {
      const labelTexts = [...$labels].map(el => el.textContent?.trim())
      expect(labelTexts).to.not.include("-1")
    })
  })
})
