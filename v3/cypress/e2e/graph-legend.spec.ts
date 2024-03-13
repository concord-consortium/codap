import { AxisHelper as ah } from "../support/helpers/axis-helper"
import { GraphLegendHelper as glh } from "../support/helpers/graph-legend-helper"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"

const arrayOfAttributes = ["Mammal", "Order", "LifeSpan", "Height", "Mass", "Sleep", "Speed", "Habitat", "Diet"]

const arrayOfValues = [
  { attribute: "Mammal", values: [] },
  { attribute: "Order", values: [] },
  { attribute: "LifeSpan", values: ["0", "10", "20", "30", "40", "50", "60", "70", "80", "90"] },
  { attribute: "Height", values: ["0", "1", "2", "3", "4", "5", "6", "7"] },
  { attribute: "Mass", values: ["0", "1000", "2000", "3000", "4000", "5000", "6000", "7000"] },
  { attribute: "Sleep", values: [] },
  { attribute: "Speed", values: [] },
  { attribute: "Habitat", values: ["both", "land", "water"] },
  { attribute: "Diet", values: ["both", "meat", "plants"] },
]

context("Test legend with various attribute types", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })
  it("will not draw legend if plot area is empty", () => {
    glh.dragAttributeToPlot(arrayOfAttributes[7]) // Habitat => plot area
    ah.verifyAxisLabel("bottom", arrayOfAttributes[7]) // Habitat => plot area
    ah.verifyDefaultAxisLabel("left")
    glh.verifyLegendDoesNotExist()
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "bottom")
  })
  it("will draw categorical legend with categorical attribute on x axis and test undo/redo", () => {

    // Initial setup: Drag attributes to the x-axis and plot area, respectively
    cy.dragAttributeToTarget("table", arrayOfAttributes[8], "bottom") // Diet => x-axis
    glh.dragAttributeToPlot(arrayOfAttributes[7]) // Habitat => plot area

    // Verify the axis and legend labels are correctly displayed
    ah.verifyAxisLabel("bottom", arrayOfAttributes[8])
    glh.verifyLegendLabel(arrayOfAttributes[7])
    glh.verifyCategoricalLegend(arrayOfValues[7].values.length)

    // Undo add legend to graph and verify removal
    toolbar.getUndoTool().click()
    ah.verifyAxisLabel("bottom", arrayOfAttributes[8])

    // Redo add legend to graph and verify legend returns
    toolbar.getRedoTool().click()
    ah.verifyAxisLabel("bottom", arrayOfAttributes[8])
    glh.verifyLegendLabel(arrayOfAttributes[7])
    glh.verifyCategoricalLegend(arrayOfValues[7].values.length)

    // Remove attributes from axis and legend
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[8], "bottom")
    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[7])
  })
  it("will draw categorical legend with categorical attribute on y axis and test undo/redo", () => {

    // Drag attribute to the y-axis and drag another attribute to the plot area
    cy.dragAttributeToTarget("table", arrayOfAttributes[8], "left") // Diet => y-axis
    glh.dragAttributeToPlot(arrayOfAttributes[7]) // Habitat => plot area

    // Verify axis label and legend
    ah.verifyAxisLabel("left", arrayOfAttributes[8])
    glh.verifyLegendLabel(arrayOfAttributes[7])
    glh.verifyCategoricalLegend(arrayOfValues[7].values.length)

    // Remove attributes from axis and legend
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[8], "left")
    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[7])

    // Undo the removal of attributes from axis and legend
    toolbar.getUndoTool().click() // Undo remove from legend
    toolbar.getUndoTool().click() // Undo remove from axis

    // Verify the attributes are restored on the axis and legend
    ah.verifyAxisLabel("left", arrayOfAttributes[8])
    glh.verifyLegendLabel(arrayOfAttributes[7])
    glh.verifyCategoricalLegend(arrayOfValues[7].values.length)

    // Redo the removal of attributes
    toolbar.getRedoTool().click() // Redo remove from legend
    toolbar.getRedoTool().click() // Redo remove from axis

    // Verify the attributes are removed from the legend
    glh.verifyLegendDoesNotExist()

  })
  it("will draw categorical legend with numerical attribute on x axis and test undo/redo", () => {

    // Setup: Drag numerical attribute to x-axis and categorical attribute to plot area
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "bottom") // Diet => x-axis
    glh.dragAttributeToPlot(arrayOfAttributes[7]) // Habitat => plot area

    // Verify initial state with axis label and legend
    ah.verifyAxisLabel("bottom", arrayOfAttributes[2])
    glh.verifyLegendLabel(arrayOfAttributes[7])
    glh.verifyCategoricalLegend(arrayOfValues[7].values.length)

    // Remove attributes from axis and legend
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "bottom")
    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[7])

    // Undo the removal of attributes
    toolbar.getUndoTool().click() // Undo remove from legend
    toolbar.getUndoTool().click() // Undo remove from axis

    // Verify the attributes are restored on the axis and legend
    ah.verifyAxisLabel("bottom", arrayOfAttributes[2])
    glh.verifyLegendLabel(arrayOfAttributes[7])
    glh.verifyCategoricalLegend(arrayOfValues[7].values.length)

    // Redo the removal of attributes
    toolbar.getRedoTool().click() // Redo remove from legend
    toolbar.getRedoTool().click() // Redo remove from axis

    // Verify the attributes are removed from the legend
    glh.verifyLegendDoesNotExist()

  })
  it("will draw categorical legend with numerical attribute on y axis and test undo/redo", () => {

    // Drag numerical attribute to y-axis and categorical attribute to plot area
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "left") // LifeSpan => y-axis
    glh.dragAttributeToPlot(arrayOfAttributes[7]) // Habitat => plot area

    // Verify axis label and legend setup
    ah.verifyAxisLabel("left", arrayOfAttributes[2])
    glh.verifyLegendLabel(arrayOfAttributes[7])
    glh.verifyCategoricalLegend(arrayOfValues[7].values.length)

    // Remove attributes from axis and legend
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "left")
    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[7])

    // Undo the removal of attributes
    toolbar.getUndoTool().click() // Undo remove from legend
    toolbar.getUndoTool().click() // Undo remove from axis

    // Verify the attributes are restored on the axis and legend
    ah.verifyAxisLabel("left", arrayOfAttributes[2])
    glh.verifyLegendLabel(arrayOfAttributes[7])
    glh.verifyCategoricalLegend(arrayOfValues[7].values.length)

    // Redo the removal of attributes
    toolbar.getRedoTool().click() // Redo remove from legend
    toolbar.getRedoTool().click() // Redo remove from axis

    // Verify the attributes are removed from the legend
    glh.verifyLegendDoesNotExist()
  })
  it("will draw numeric legend with categorical attribute on x axis and test undo/redo", () => {
    // Initial setup: Drag categorical attribute to x-axis and numerical attribute to plot area
    cy.dragAttributeToTarget("table", arrayOfAttributes[8], "bottom") // Diet => x-axis
    glh.dragAttributeToPlot(arrayOfAttributes[3]) // Height => plot area

    // Verify axis and legend setup
    ah.verifyAxisLabel("bottom", arrayOfAttributes[8])
    glh.verifyLegendLabel(arrayOfAttributes[3])
    glh.verifyNumericLegend()

    // Remove attributes from axis and legend
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[8], "bottom")
    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[3])

    // Undo the removal of attributes
    toolbar.getUndoTool().click() // Undo remove from legend
    toolbar.getUndoTool().click() // Undo remove from axis

    // Verify attributes are restored on axis and legend
    ah.verifyAxisLabel("bottom", arrayOfAttributes[8])
    glh.verifyLegendLabel(arrayOfAttributes[3])
    glh.verifyNumericLegend()

    // Redo the removal of attributes
    toolbar.getRedoTool().click() // Redo remove from legend
    toolbar.getRedoTool().click() // Redo remove from axis

    // Verify the attributes are removed from the legend
    glh.verifyLegendDoesNotExist()
  })
  it("will draw numeric legend with categorical attribute on y axis and test undo/redo", () => {
    // Initial setup: Drag categorical attribute to y-axis and numerical attribute to plot area
    cy.dragAttributeToTarget("table", arrayOfAttributes[8], "left") // Diet => y-axis
    glh.dragAttributeToPlot(arrayOfAttributes[3]) // Height => plot area

    // Verify axis and legend setup
    ah.verifyAxisLabel("left", arrayOfAttributes[8])
    glh.verifyLegendLabel(arrayOfAttributes[3])
    glh.verifyNumericLegend()

    // Remove attributes from axis and legend
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[8], "left")
    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[3])

    // Undo the removal of attributes
    toolbar.getUndoTool().click() // Undo remove from legend
    toolbar.getUndoTool().click() // Undo remove from axis

    // Verify attributes are restored on axis and legend
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[8], "left")
    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[3])

    // Redo the removal of attributes
    // Note: Redo button disables in Cypress at this step.
    // The disable doesn't happen in CODAP though.
    // Used force:true so that test can happen.
    toolbar.getRedoTool().click({force: true}) // Redo remove from legend
    toolbar.getRedoTool().click({force: true}) // Redo remove from axis

    // Verify the attributes are removed from the legend
    glh.verifyLegendDoesNotExist()
  })
  it("will draw numeric legend with numerical attribute on x axis and test undo/redo", () => {
    // Setup: Drag numerical attributes to x-axis and plot area
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "bottom") // LifeSpan => x-axis
    glh.dragAttributeToPlot(arrayOfAttributes[3]) // Height => plot area

    // Verify axis and legend setup
    ah.verifyAxisLabel("bottom", arrayOfAttributes[2])
    glh.verifyLegendLabel(arrayOfAttributes[3])
    glh.verifyNumericLegend()

    // Remove attributes from axis and legend
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "bottom")
    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[3])

    // Undo the removal of attributes
    toolbar.getUndoTool().click() // Undo remove from legend
    toolbar.getUndoTool().click() // Undo remove from axis

    // Verify attributes are restored on axis and legend
    ah.verifyAxisLabel("bottom", arrayOfAttributes[2])
    glh.verifyLegendLabel(arrayOfAttributes[3])
    glh.verifyNumericLegend()

    // Redo the removal of attributes
    toolbar.getRedoTool().click() // Redo remove from legend
    toolbar.getRedoTool().click() // Redo remove from axis

    // Verify the attributes are removed from the legend
    glh.verifyLegendDoesNotExist()
  })
  it("will draw numeric legend with numerical attribute on y axis and test undo/redo", () => {
    // Initial setup: Drag numerical attribute to y-axis and another numerical attribute to plot area
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "left") // LifeSpan => y-axis
    glh.dragAttributeToPlot(arrayOfAttributes[3]) // Height => plot area

    // Verify axis and legend setup
    ah.verifyAxisLabel("left", arrayOfAttributes[2])
    glh.verifyLegendLabel(arrayOfAttributes[3])
    glh.verifyNumericLegend()

    // Remove attribute from axis and legend
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "left")
    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[3])

    // Undo the removal of attributes
    toolbar.getUndoTool().click() // Undo remove from legend
    toolbar.getUndoTool().click() // Undo remove from axis

    // Verify attribute are restored on axis and legend
    ah.verifyAxisLabel("left", arrayOfAttributes[2])
    glh.verifyLegendLabel(arrayOfAttributes[3])
    glh.verifyNumericLegend()

    // Redo the removal of attributes
    toolbar.getRedoTool().click() // Redo remove from legend
    toolbar.getRedoTool().click() // Redo remove from axis

    // Verify the attributes are removed from the legend
    glh.verifyLegendDoesNotExist()
  })
})

context("Test drawing legend on existing legend", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })
  it("will draw categorical legend on existing categorical legend", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "bottom") // LifeSpan => x-axis
    glh.dragAttributeToPlot(arrayOfAttributes[7]) // Habitat => plot area
    ah.verifyAxisLabel("bottom", arrayOfAttributes[2])
    glh.verifyLegendLabel(arrayOfAttributes[7])
    glh.verifyCategoricalLegend(arrayOfValues[7].values.length)
    glh.dragAttributeToLegend(arrayOfAttributes[8]) // Diet => plot area
    glh.verifyLegendLabel(arrayOfAttributes[8])
    glh.verifyCategoricalLegend(arrayOfValues[8].values.length)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "bottom")
    glh.verifyLegendLabel(arrayOfAttributes[8])
    glh.verifyCategoricalLegend(arrayOfValues[8].values.length)
    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[8])
  })
  it("will draw categorical legend on existing numeric legend", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "left") // LifeSpan => x-axis
    glh.dragAttributeToPlot(arrayOfAttributes[3]) // Height => plot area
    ah.verifyAxisLabel("left", arrayOfAttributes[2])
    glh.verifyLegendLabel(arrayOfAttributes[3])
    glh.verifyNumericLegend()
    // Temporarily changing this because of #184764820
    glh.dragAttributeToPlot(arrayOfAttributes[8]) // Diet => plot area
    glh.verifyLegendLabel(arrayOfAttributes[8])
    glh.verifyCategoricalLegend(arrayOfValues[8].values.length)
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "left")
    glh.verifyLegendLabel(arrayOfAttributes[8])
    glh.verifyCategoricalLegend(arrayOfValues[8].values.length)
    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[8])
  })
  it("will draw numeric legend on existing categorical legend", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "bottom") // LifeSpan => x-axis
    glh.dragAttributeToPlot(arrayOfAttributes[7]) // Habitat => plot area
    ah.verifyAxisLabel("bottom", arrayOfAttributes[2])
    glh.verifyLegendLabel(arrayOfAttributes[7])
    glh.verifyCategoricalLegend(arrayOfValues[7].values.length)
    glh.dragAttributeToLegend(arrayOfAttributes[3]) // Height => plot area
    glh.verifyLegendLabel(arrayOfAttributes[3])
    glh.verifyNumericLegend()
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "bottom")
    glh.verifyLegendLabel(arrayOfAttributes[3])
    glh.verifyNumericLegend()
    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[3])
  })
  it("will draw numeric legend on existing numeric legend", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "left") // LifeSpan => x-axis
    glh.dragAttributeToPlot(arrayOfAttributes[3]) // Height => plot area
    ah.verifyAxisLabel("left", arrayOfAttributes[2])
    glh.verifyLegendLabel(arrayOfAttributes[3])
    glh.verifyNumericLegend()
    // Temporarily changing this because of #184764820
    glh.dragAttributeToPlot(arrayOfAttributes[4]) // Mass => plot area
    glh.verifyLegendLabel(arrayOfAttributes[4])
    glh.verifyNumericLegend()
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "left")
    glh.verifyLegendLabel(arrayOfAttributes[4])
    glh.verifyNumericLegend()
    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[4])
  })
})
context("Test selecting and selecting categories in legend", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })
  it("will select and unselect categories in categorical legend with categorical x axis", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[8], "bottom") // Diet => x-axis
    glh.dragAttributeToPlot(arrayOfAttributes[7]) // Habitat => plot area
    glh.selectCategoryNameForCategoricalLegend(arrayOfValues[7].values[0])
    glh.verifyCategoricalLegendKeySelected(arrayOfValues[7].values[0])
    glh.selectCategoryNameForCategoricalLegend(arrayOfValues[7].values[1])
    glh.verifyCategoricalLegendKeySelected(arrayOfValues[7].values[1])
    glh.selectCategoryNameForCategoricalLegend(arrayOfValues[7].values[2])
    glh.verifyCategoricalLegendKeySelected(arrayOfValues[7].values[2])
    glh.selectCategoryColorForCategoricalLegend(arrayOfValues[7].values[0])
    glh.verifyCategoricalLegendKeySelected(arrayOfValues[7].values[0])
    glh.selectCategoryColorForCategoricalLegend(arrayOfValues[7].values[1])
    glh.verifyCategoricalLegendKeySelected(arrayOfValues[7].values[1])
    glh.selectCategoryColorForCategoricalLegend(arrayOfValues[7].values[2])
    glh.verifyCategoricalLegendKeySelected(arrayOfValues[7].values[2])

    glh.unselectLegendCategory()
    glh.verifyNoLegendCategorySelectedForCategoricalLegend()
    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[7])
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[8], "bottom")
  })
  it("will select and unselect keys in numeric legend with categorical x axis", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[8], "bottom") // Diet => x-axis
    glh.dragAttributeToPlot(arrayOfAttributes[3]) // Height => plot area
    glh.selectNumericLegendCategory(0)
    glh.verifyNumericLegendKeySelected()
    glh.selectNumericLegendCategory(1)
    glh.verifyNumericLegendKeySelected()

    glh.unselectLegendCategory()
    glh.verifyNoLegendCategorySelectedForNumericLegend()

    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[3])
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[8], "bottom")
  })
})
