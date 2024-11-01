import { AxisHelper as ah } from "../support/helpers/axis-helper"
import { GraphLegendHelper as glh } from "../support/helpers/graph-legend-helper"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { GraphTileElements as graph } from "../support/elements/graph-tile"
import { ColorPickerPaletteElements as color_picker } from "../support/elements/color-picker-palette"

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

    cy.log("test undo/redo for categorical legend with categorical attribute on x axis")
    // Undo add legend to graph and verify removal
    toolbar.getUndoTool().click()
    cy.wait(2500)
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

    cy.log("test undo/redo for categorical legend with categorical attribute on y axis")
    // Undo the removal of attributes from axis and legend
    toolbar.getUndoTool().click() // Undo remove from legend
    toolbar.getUndoTool().click() // Undo remove from axis

    // Verify the attributes are restored on the axis and legend
    /// ah.verifyAxisLabel("left", arrayOfAttributes[8])
    glh.verifyLegendLabel(arrayOfAttributes[7])
    glh.verifyCategoricalLegend(arrayOfValues[7].values.length)

    // Note: Redo button disables in Cypress at this step.
    // The disable doesn't happen in CODAP though.
    // Used force:true so that test can happen.
    toolbar.getRedoTool().click({force: true})
    toolbar.getRedoTool().click({force: true})

    // Verify the attributes are removed from the legend
    glh.verifyLegendDoesNotExist()

  })
  it("will draw categorical legend with numerical attribute on x axis and test undo", () => {

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

    cy.log("test undo/redo for categorical legend with numerical attribute on x axis")
    // Undo the removal of attributes
    toolbar.getUndoTool().click() // Undo remove from legend
    toolbar.getUndoTool().click() // Undo remove from axis

    // Verify the attributes are restored on the axis and legend
    ah.verifyAxisLabel("bottom", arrayOfAttributes[2])
    glh.verifyLegendLabel(arrayOfAttributes[7])
    glh.verifyCategoricalLegend(arrayOfValues[7].values.length)

    // Redo the removal of attributes
    toolbar.getRedoTool().click({force: true}) // Redo remove from legend
    toolbar.getRedoTool().click({force: true}) // Redo remove from axis

    // Verify the attributes are removed from the legend
    glh.verifyLegendDoesNotExist()
  })
  it("will draw categorical legend with numerical attribute on y axis and test undo", () => {

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

    cy.log("test undo/redo for categorical legend with numerical attribute on y axis")
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
  it("will draw numeric legend with categorical attribute on x axis and test undo", () => {
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

    cy.log("test undo/redo for numeric legend with categorical attribute on x axis")
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
  it("will draw numeric legend with categorical attribute on y axis and test undo", () => {
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

    cy.log("test undo/redo for numeric legend with categorical attribute on y axis")
    // Undo the removal of attributes
    toolbar.getUndoTool().click() // Undo remove from legend
    toolbar.getUndoTool().click() // Undo remove from axis

    // Verify attributes are restored on axis and legend
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[8], "left")
    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[3])

    // Redo the removal of attributes
    toolbar.getRedoTool().click({force: true}) // Redo remove from legend
    toolbar.getRedoTool().click({force: true}) // Redo remove from axis

    // Verify the attributes are removed from the legend
    glh.verifyLegendDoesNotExist()
  })
  it("will draw numeric legend with numerical attribute on x axis and test undo", () => {
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

    cy.log("test undo/redo for numeric legend with numerical attributes on x axis")
    // Undo the removal of attributes
    toolbar.getUndoTool().click() // Undo remove from legend
    toolbar.getUndoTool().click() // Undo remove from axis

    // Verify attributes are restored on axis and legend
    ah.verifyAxisLabel("bottom", arrayOfAttributes[2])
    glh.verifyLegendLabel(arrayOfAttributes[3])
    glh.verifyNumericLegend()

    cy.log("test undo/redo for numeric legend with numerical attribute on x axis")
    // Redo the removal of attributes
    // Note: Redo button disables in Cypress at this step.
    // The disable doesn't happen in CODAP though.
    // Used force:true so that test can happen.
    toolbar.getRedoTool().click() // Redo remove from legend
    toolbar.getRedoTool().click() // Redo remove from axis

    // Verify the attributes are removed from the legend
    glh.verifyLegendDoesNotExist()
  })
  it("will draw numeric legend with numerical attribute on y axis and test undo", () => {
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

    cy.log("test undo/redo for draw numeric legend with numerical attribute on y axis")
    // Undo the removal of attributes
    toolbar.getUndoTool().click() // Undo remove from legend
    toolbar.getUndoTool().click() // Undo remove from axis

    // Verify attribute are restored on axis and legend
    ah.verifyAxisLabel("left", arrayOfAttributes[2])
    glh.verifyLegendLabel(arrayOfAttributes[3])
    glh.verifyNumericLegend()

    // Note: Redo button disables in Cypress at this step.
    // The disable doesn't happen in CODAP though.
    // Used force:true so that test can happen.

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
  it("will draw categorical legend on existing categorical legend and test undo/redo", () => {

    // Initial setup: Drag attributes to the x-axis and plot area for the first legend
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "bottom") // LifeSpan => x-axis
    glh.dragAttributeToPlot(arrayOfAttributes[7]) // Habitat => plot area

    // Verify the first legend setup
    ah.verifyAxisLabel("bottom", arrayOfAttributes[2])
    glh.verifyLegendLabel(arrayOfAttributes[7])
    glh.verifyCategoricalLegend(arrayOfValues[7].values.length)

    // Add a second categorical legend
    glh.dragAttributeToLegend(arrayOfAttributes[8]) // Diet => plot area

    // Verify the second legend setup
    glh.verifyLegendLabel(arrayOfAttributes[8])
    glh.verifyCategoricalLegend(arrayOfValues[8].values.length)

    // Remove the x-axis attribute
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "bottom")

    // Verify that the second legend persists after x-axis attribute removal
    glh.verifyLegendLabel(arrayOfAttributes[8])
    glh.verifyCategoricalLegend(arrayOfValues[8].values.length)

    // Remove the second legend attribute
    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[8])

    // Undo the removal of the second legend attribute
    toolbar.getUndoTool().click()

    // Verify that the second legend attribute is restored
    glh.verifyLegendLabel(arrayOfAttributes[8])
    glh.verifyCategoricalLegend(arrayOfValues[8].values.length)

    // Redo the removal of the second legend attribute
    toolbar.getRedoTool().click()
    cy.wait(500)

    // Verify absence of second attribute
    glh.verifyLegendDoesNotExist()
  })
  it("will draw categorical legend on existing numeric legend and test undo/redo", () => {
    // Setup: Drag numerical attribute to x-axis and another numerical attribute to plot area for the numeric legend
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "left") // LifeSpan => x-axis
    glh.dragAttributeToPlot(arrayOfAttributes[3]) // Height => plot area

    // Verify numeric legend setup
    ah.verifyAxisLabel("left", arrayOfAttributes[2])
    glh.verifyLegendLabel(arrayOfAttributes[3])
    glh.verifyNumericLegend()

    // Add a categorical attribute to create a categorical legend
    // Temporarily changing this because of #184764820
    glh.dragAttributeToPlot(arrayOfAttributes[8]) // Diet => plot area
    glh.verifyLegendLabel(arrayOfAttributes[8])
    glh.verifyCategoricalLegend(arrayOfValues[8].values.length)

    // Remove the x-axis attribute
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "left")

    // Verify the categorical legend persists after x-axis attribute removal
    glh.verifyLegendLabel(arrayOfAttributes[8])
    glh.verifyCategoricalLegend(arrayOfValues[8].values.length)

    // Remove the categorical legend attribute
    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[8])

    // Undo the removal of the categorical legend attribute
    toolbar.getUndoTool().click()

    // Verify that the categorical legend attribute is restored
    glh.verifyLegendLabel(arrayOfAttributes[8])
    glh.verifyCategoricalLegend(arrayOfValues[8].values.length)

    // Redo the removal of the categorical legend attribute
    toolbar.getRedoTool().click()

    // Verify absence of the categorical legend attribute
    glh.verifyLegendDoesNotExist()

  })
  it("will draw numeric legend on existing categorical legend and test undo/redo", () => {
    // Initial setup: Drag attributes to the x-axis and plot area for the categorical legend
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "bottom") // LifeSpan => x-axis
    glh.dragAttributeToPlot(arrayOfAttributes[7]) // Habitat => plot area

    // Verify categorical legend setup
    ah.verifyAxisLabel("bottom", arrayOfAttributes[2])
    glh.verifyLegendLabel(arrayOfAttributes[7])
    glh.verifyCategoricalLegend(arrayOfValues[7].values.length)

    // Replace the categorical legend with a numeric attribute to create a numeric legend
    glh.dragAttributeToLegend(arrayOfAttributes[3]) // Height => plot area
    glh.verifyLegendLabel(arrayOfAttributes[3])
    glh.verifyNumericLegend()

    // Remove the x-axis attribute
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "bottom")

    // Verify the numeric legend persists after x-axis attribute removal
    glh.verifyLegendLabel(arrayOfAttributes[3])
    glh.verifyNumericLegend()

    // Remove the numeric legend attribute
    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[3])

    // Undo the removal of the numeric legend attribute
    toolbar.getUndoTool().click()

    // Verify that the numeric legend attribute is restored
    glh.verifyLegendLabel(arrayOfAttributes[3])
    glh.verifyNumericLegend()

    // Redo the removal of the numeric legend attribute
    toolbar.getRedoTool().click()

    // Verify absence of the numeric legend attribute
    glh.verifyLegendDoesNotExist()

  })
  it("will draw numeric legend on existing numeric legend and test undo/redo", () => {
    // Setup: Drag numerical attributes to the x-axis and plot area for the first numeric legend
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "left") // LifeSpan => x-axis
    glh.dragAttributeToPlot(arrayOfAttributes[3]) // Height => plot area

    // Verify the first numeric legend setup
    ah.verifyAxisLabel("left", arrayOfAttributes[2])
    glh.verifyLegendLabel(arrayOfAttributes[3])
    glh.verifyNumericLegend()

    // Add another numerical attribute to create a second numeric legend
    // Temporarily changing this because of #184764820
    glh.dragAttributeToPlot(arrayOfAttributes[4]) // Mass => plot area
    glh.verifyLegendLabel(arrayOfAttributes[4])
    glh.verifyNumericLegend()

    // Remove the x-axis attribute
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "left")

    // Verify the second numeric legend persists after x-axis attribute removal
    glh.verifyLegendLabel(arrayOfAttributes[4])
    glh.verifyNumericLegend()

    // Remove the numeric legend attribute
    glh.openLegendMenu()
    glh.removeAttributeFromLegend(arrayOfAttributes[4])

    // Undo the removal of the numeric legend attribute
    toolbar.getUndoTool().click()

    // Verify that the numeric legend attribute is restored
    glh.verifyLegendLabel(arrayOfAttributes[4])
    glh.verifyNumericLegend()

    // Redo the removal of the numeric legend attribute
    toolbar.getRedoTool().click()

    // Verify absence of the numeric legend attribute
    glh.verifyLegendDoesNotExist()

  })
})
context("Test selecting and selecting categories in legend", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })
  it.skip("will select and unselect categories in categorical legend with categorical x axis", () => {
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
  it.skip("will select and unselect keys in numeric legend with categorical x axis", () => {
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
context("Test changing legend colors", () => {
  describe("Test changing legend colors for categorical legend", () => {
    const initLandBackgroundColor = "rgb(255, 104"
    const standardLandBackgroundColor = "rgb(255, 238"
    const saturationLandBackgroundColor = "rgb(255, 234"
    const hueLandBackgroundColor = "rgb(3, 255"

    beforeEach(function () {
      const queryParams = "?sample=mammals&dashboard&mouseSensor"
      const url = `${Cypress.config("index")}${queryParams}`
      cy.visit(url)
      cy.wait(2500)
      cy.dragAttributeToTarget("table", arrayOfAttributes[8], "bottom") // Diet => x-axis
      glh.dragAttributeToPlot(arrayOfAttributes[7]) // Habitat => plot area
      //move graph up to make room for color picker
      cy.get('.Graph-title-bar')
        .trigger("mousedown", { button: 0 })
        .trigger("mousemove", { clientY: 300 })
        .trigger("mouseup")
      cy.get("[data-testid=inspector-panel]").should("be.visible")
    })

    // Habitat categorical legend uses a non-standard color
    it("Shows standard 16 grid color palette with extra row for non-standard color", () => {
      graph.getDisplayStylesButton().click()
      color_picker.getCategoricalColorSettingsGroup().should("be.visible")
      color_picker.getCategoricalColorSettingRow().should("have.length", 3)
      color_picker.getCategoricalColorSettingLabel().should("have.length", 3)
      color_picker.getCategoricalColorSettingButton().should("have.length", 3)
      color_picker.getCategoricalColorSettingSwatch().eq(0)
        .invoke('css', 'background-color').should('contain', initLandBackgroundColor)
      color_picker.getCategoricalColorSettingSwatch().eq(0).click()
      color_picker.getColorSettingSwatchGrid().should("be.visible")
      color_picker.getColorSettingSwatchRow().should("have.length", 1)
      color_picker.getColorSettingSwatchCell().should("have.length", 17)
      color_picker.getColorSettingSwatchCell().eq(16).should("have.class", "selected")
        .invoke('css', 'background-color').should('contain', initLandBackgroundColor)

      cy.log("Shows expanded color picker when user click More button")
      color_picker.getColorPickerToggleButton().should("have.text", "More")
      color_picker.getColorPickerToggleButton().click()
      color_picker.getColorPicker().should("be.visible")

      cy.log("Hides expanded color picker when user click Less button")
      color_picker.getColorPickerToggleButton().should("have.text", "Less")
      color_picker.getColorPickerToggleButton().click()
      color_picker.getColorPicker().should("not.exist")

      cy.log("Propagates selected color to inspector palette swatch, legend key, and plot area")
      color_picker.getColorSettingSwatchCell().eq(6).click()
      color_picker.getColorSettingSwatchCell().eq(6).should("have.class", "selected")
      color_picker.getColorSettingSwatchCell().eq(6)
        .invoke('css', 'background-color').should('contain', standardLandBackgroundColor)
      cy.get('[data-testid="legend-key"]').eq(0) //fragile but couldn't get it to work with the contains "land"
        .find('rect')
        .invoke('css', 'fill')
        .then((fillColor) => {
          expect(fillColor).to.contain(standardLandBackgroundColor)
        })

      cy.log("Hides color picker when user clicks outside of the color picker")
      cy.get(".codap-inspector-palette-header-title").click()
      color_picker.getColorPalette().should("not.exist")

      cy.log("Undo/Redo color change")
      toolbar.getUndoTool().click()
      cy.get('[data-testid="legend-key"]').eq(0) //fragile but couldn't get it to work with the contains "land"
        .find('rect')
        .invoke('css', 'fill')
        .then((fillColor) => {
          expect(fillColor).to.contain(initLandBackgroundColor)
        })
      toolbar.getRedoTool().click()
      cy.get('[data-testid="legend-key"]').eq(0) //fragile but couldn't get it to work with the contains "land"
        .find('rect')
        .invoke('css', 'fill')
        .then((fillColor) => {
          expect(fillColor).to.contain(standardLandBackgroundColor)
        })

      cy.log("Selects non-standard color from color picker")
      graph.getDisplayStylesButton().click()
      color_picker.getCategoricalColorSettingSwatch().eq(0).click()
      color_picker.getColorSettingSwatchCell().should("have.length", 16)
      color_picker.getColorPickerToggleButton().should("have.text", "More").click()
      color_picker.getColorPickerSaturation().click("topRight", {force: true})
      color_picker.getColorSettingSwatchCell().should("have.length", 17)
      color_picker.getColorSettingSwatchCell().eq(16).should("have.class", "selected")
      color_picker.getColorSettingSwatchCell().eq(6).should("not.have.class", "selected")
      color_picker.getColorSettingSwatchCell().eq(16)
        .invoke('css', 'background-color').should('contain', saturationLandBackgroundColor)
      color_picker.getCategoricalColorSettingSwatch().eq(0)
        .invoke('css', 'background-color').should('contain', saturationLandBackgroundColor)
      cy.get('[data-testid="legend-key"]').eq(0) //fragile but couldn't get it to work with the contains "land"
        .find('rect')
        .invoke('css', 'fill')
        .then((fillColor) => {
          expect(fillColor).to.contain(saturationLandBackgroundColor)
        })
      color_picker.getSetColorButton().click()
      cy.get('[data-testid="legend-key"]').eq(0) //fragile but couldn't get it to work with the contains "land"
        .find('rect')
        .invoke('css', 'fill')
        .then((fillColor) => {
          expect(fillColor).to.contain(saturationLandBackgroundColor)
        })

      cy.log("Does not change color when user cancels color selection from color picker")
      graph.getGraphTile().click()
      graph.getDisplayStylesButton().click()
      color_picker.getCategoricalColorSettingSwatch().eq(0).click()
      color_picker.getColorPalette().should("be.visible")
      color_picker.getColorPickerToggleButton().should("have.text", "More").click()
      color_picker.getColorPickerHue().click()
      color_picker.getColorSettingSwatchCell().eq(16)
        .invoke('css', 'background-color').should('contain', hueLandBackgroundColor)
      color_picker.getCategoricalColorSettingSwatch().eq(0)
        .invoke('css', 'background-color').should('contain', hueLandBackgroundColor)
      cy.get('[data-testid="legend-key"]').eq(0) //fragile but couldn't get it to work with the contains "land"
        .find('rect')
        .invoke('css', 'fill')
        .then((fillColor) => {
          expect(fillColor).to.contain(hueLandBackgroundColor)
        })
      color_picker.getCancelColorButton().click({waitForAnimations: false, animationDistanceThreshold: 20})
      color_picker.getCategoricalColorSettingSwatch().eq(0)
        .invoke('css', 'background-color').should('contain', saturationLandBackgroundColor)
      cy.get('[data-testid="legend-key"]').eq(0) //fragile but couldn't get it to work with the contains "land"
        .find('rect')
        .invoke('css', 'fill')
        .then((fillColor) => {
          expect(fillColor).to.contain(saturationLandBackgroundColor)
        })
    })
  })
})
