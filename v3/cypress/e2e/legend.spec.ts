import { AxisHelper as ah } from "../support/helpers/axis-helper"
import { LegendHelper as lh } from "../support/helpers/legend-helper"

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
    lh.dragAttributeToPlot(arrayOfAttributes[7]) // Habitat => plot area
    ah.verifyAxisLabel("x", arrayOfAttributes[7]) // Habitat => plot area
    ah.verifyDefaultAxisLabel("y")
    lh.verifyLegendDoesNotExist()
    ah.openAxisAttributeMenu("x")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "x")
  })
  it("will draw categorical legend with categorical attribute on x axis", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[8], "x") // Diet => x-axis
    lh.dragAttributeToPlot(arrayOfAttributes[7]) // Habitat => plot area
    ah.verifyAxisLabel("x", arrayOfAttributes[8])
    lh.verifyLegendLabel(arrayOfAttributes[7])
    lh.verifyCategoricalLegend()
    ah.openAxisAttributeMenu("x")
    ah.removeAttributeFromAxis(arrayOfAttributes[8], "x")
    lh.openLegendMenu()
    lh.removeAttributeFromLegend(arrayOfAttributes[7])
  })
  it("will draw categorical legend with categorical attribute on y axis", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[8], "y") // Diet => y-axis
    lh.dragAttributeToPlot(arrayOfAttributes[7]) // Habitat => plot area
    ah.verifyAxisLabel("y", arrayOfAttributes[8])
    lh.verifyLegendLabel(arrayOfAttributes[7])
    lh.verifyCategoricalLegend()
    ah.openAxisAttributeMenu("y")
    ah.removeAttributeFromAxis(arrayOfAttributes[8], "y")
    lh.openLegendMenu()
    lh.removeAttributeFromLegend(arrayOfAttributes[7])
  })
  it("will draw categorical legend with numerical attribute on x axis", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "x") // Diet => x-axis
    lh.dragAttributeToPlot(arrayOfAttributes[7]) // Habitat => plot area
    ah.verifyAxisLabel("x", arrayOfAttributes[2])
    lh.verifyLegendLabel(arrayOfAttributes[7])
    lh.verifyCategoricalLegend()
    ah.openAxisAttributeMenu("x")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "x")
    lh.openLegendMenu()
    lh.removeAttributeFromLegend(arrayOfAttributes[7])
  })
  it("will draw categorical legend with numerical attribute on y axis", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "y") // LifeSpan => y-axis
    lh.dragAttributeToPlot(arrayOfAttributes[7]) // Habitat => plot area
    ah.verifyAxisLabel("y", arrayOfAttributes[2])
    lh.verifyLegendLabel(arrayOfAttributes[7])
    lh.verifyCategoricalLegend()
    ah.openAxisAttributeMenu("y")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "y")
    lh.openLegendMenu()
    lh.removeAttributeFromLegend(arrayOfAttributes[7])
  })
  it("will draw numeric legend with categorical attribute on x axis", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[8], "x") // Diet => x-axis
    lh.dragAttributeToPlot(arrayOfAttributes[3]) // Height => plot area
    ah.verifyAxisLabel("x", arrayOfAttributes[8])
    lh.verifyLegendLabel(arrayOfAttributes[3])
    lh.verifyNumericLegend()
    ah.openAxisAttributeMenu("x")
    ah.removeAttributeFromAxis(arrayOfAttributes[8], "x")
    lh.openLegendMenu()
    lh.removeAttributeFromLegend(arrayOfAttributes[3])
  })
  it("will draw numeric legend with categorical attribute on y axis", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[8], "y") // Diet => y-axis
    lh.dragAttributeToPlot(arrayOfAttributes[3]) // Height => plot area
    ah.verifyAxisLabel("y", arrayOfAttributes[8])
    lh.verifyLegendLabel(arrayOfAttributes[3])
    lh.verifyNumericLegend()
    ah.openAxisAttributeMenu("y")
    ah.removeAttributeFromAxis(arrayOfAttributes[8], "y")
    lh.openLegendMenu()
    lh.removeAttributeFromLegend(arrayOfAttributes[3])
  })
  it("will draw numeric legend with numerical attribute on x axis", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "x") // LifeSpan => x-axis
    lh.dragAttributeToPlot(arrayOfAttributes[3]) // Height => plot area
    ah.verifyAxisLabel("x", arrayOfAttributes[2])
    lh.verifyLegendLabel(arrayOfAttributes[3])
    lh.verifyNumericLegend()
    ah.openAxisAttributeMenu("x")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "x")
    lh.openLegendMenu()
    lh.removeAttributeFromLegend(arrayOfAttributes[3])
  })
  it("will draw numeric legend with numerical attribute on y axis", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "y") // LifeSpan => y-axis
    lh.dragAttributeToPlot(arrayOfAttributes[3]) // Height => plot area
    ah.verifyAxisLabel("y", arrayOfAttributes[2])
    lh.verifyLegendLabel(arrayOfAttributes[3])
    lh.verifyNumericLegend()
    ah.openAxisAttributeMenu("y")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "y")
    lh.openLegendMenu()
    lh.removeAttributeFromLegend(arrayOfAttributes[3])
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
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "x") // LifeSpan => x-axis
    lh.dragAttributeToPlot(arrayOfAttributes[7]) // Habitat => plot area
    ah.verifyAxisLabel("x", arrayOfAttributes[2])
    lh.verifyLegendLabel(arrayOfAttributes[7])
    lh.verifyCategoricalLegend()
    lh.dragAttributeToLegend(arrayOfAttributes[8]) // Diet => plot area
    lh.verifyLegendLabel(arrayOfAttributes[8])
    lh.verifyCategoricalLegend()
    ah.openAxisAttributeMenu("x")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "x")
    lh.verifyLegendLabel(arrayOfAttributes[8])
    lh.verifyCategoricalLegend()
    lh.openLegendMenu()
    lh.removeAttributeFromLegend(arrayOfAttributes[8])
  })
  it("will draw categorical legend on existing numeric legend", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "y") // LifeSpan => x-axis
    lh.dragAttributeToPlot(arrayOfAttributes[3]) // Height => plot area
    ah.verifyAxisLabel("y", arrayOfAttributes[2])
    lh.verifyLegendLabel(arrayOfAttributes[3])
    lh.verifyNumericLegend()
    // Temporarily changing this because of #184764820
    lh.dragAttributeToPlot(arrayOfAttributes[8]) // Diet => plot area
    lh.verifyLegendLabel(arrayOfAttributes[8])
    lh.verifyCategoricalLegend()
    ah.openAxisAttributeMenu("y")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "y")
    lh.verifyLegendLabel(arrayOfAttributes[8])
    lh.verifyCategoricalLegend()
    lh.openLegendMenu()
    lh.removeAttributeFromLegend(arrayOfAttributes[8])
  })
  it("will draw numeric legend on existing categorical legend", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "x") // LifeSpan => x-axis
    lh.dragAttributeToPlot(arrayOfAttributes[7]) // Habitat => plot area
    ah.verifyAxisLabel("x", arrayOfAttributes[2])
    lh.verifyLegendLabel(arrayOfAttributes[7])
    lh.verifyCategoricalLegend()
    lh.dragAttributeToLegend(arrayOfAttributes[3]) // Height => plot area
    lh.verifyLegendLabel(arrayOfAttributes[3])
    lh.verifyNumericLegend()
    ah.openAxisAttributeMenu("x")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "x")
    lh.verifyLegendLabel(arrayOfAttributes[3])
    lh.verifyNumericLegend()
    lh.openLegendMenu()
    lh.removeAttributeFromLegend(arrayOfAttributes[3])
  })
  it("will draw numeric legend on existing numeric legend", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "y") // LifeSpan => x-axis
    lh.dragAttributeToPlot(arrayOfAttributes[3]) // Height => plot area
    ah.verifyAxisLabel("y", arrayOfAttributes[2])
    lh.verifyLegendLabel(arrayOfAttributes[3])
    lh.verifyNumericLegend()
    // Temporarily changing this because of #184764820
    lh.dragAttributeToPlot(arrayOfAttributes[4]) // Mass => plot area
    lh.verifyLegendLabel(arrayOfAttributes[4])
    lh.verifyNumericLegend()
    ah.openAxisAttributeMenu("y")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "y")
    lh.verifyLegendLabel(arrayOfAttributes[4])
    lh.verifyNumericLegend()
    lh.openLegendMenu()
    lh.removeAttributeFromLegend(arrayOfAttributes[4])
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
    cy.dragAttributeToTarget("table", arrayOfAttributes[8], "x") // Diet => x-axis
    lh.dragAttributeToPlot(arrayOfAttributes[7]) // Habitat => plot area
    lh.selectCategoryNameForCategoricalLegend(arrayOfValues[7].values[0])
    lh.verifyLegendCategorySelected(arrayOfValues[7].values[0])
    lh.selectCategoryNameForCategoricalLegend(arrayOfValues[7].values[1])
    lh.verifyLegendCategorySelected(arrayOfValues[7].values[1])
    lh.selectCategoryNameForCategoricalLegend(arrayOfValues[7].values[2])
    lh.verifyLegendCategorySelected(arrayOfValues[7].values[2])
    lh.selectCategoryColorForCategoricalLegend(arrayOfValues[7].values[0])
    lh.verifyLegendCategorySelected(arrayOfValues[7].values[0])
    lh.selectCategoryColorForCategoricalLegend(arrayOfValues[7].values[1])
    lh.verifyLegendCategorySelected(arrayOfValues[7].values[1])
    lh.selectCategoryColorForCategoricalLegend(arrayOfValues[7].values[2])
    lh.verifyLegendCategorySelected(arrayOfValues[7].values[2])
    // lh.unselectCategoricalLegendCategory() //This doesn't work, will need to make this work
    // lh.verifyNoLegendCategorySelectedForCategoricalLegend()
    lh.openLegendMenu()
    lh.removeAttributeFromLegend(arrayOfAttributes[7])
    ah.openAxisAttributeMenu("x")
    ah.removeAttributeFromAxis(arrayOfAttributes[8], "x")
  })
})
