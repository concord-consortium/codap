export const ComponentElements = {
  tooltips: {
    tableToolShelfIcon: "Open a case table for each data set(ctrl-alt-t)",
    graphToolShelfIcon: "Make a graph (ctrl-alt-g)",
    sliderToolShelfIcon: "Make a slider (ctrl-alt-s)",
    calculatorToolShelfIcon: "Open/close the calculator (ctrl-alt-c)",
    minimizeComponent: "Minimize or expand this Component",
    closeComponent: "Close this Component",
    inspectorPanel: "Change what is shown along with the points",
    graphResizeButton: "Resize all columns to fit data",
    graphHideShowButton: "Show all cases or hide selected/unselected cases",
    graphDisplayValuesButton: "Change what is shown along with the points",
    graphDisplayConfigButton: "Configure the display differently",
    graphDisplayStylesButton: "Change the appearance of the display",
    graphCameraButton: "Save the image as a PNG file",
    tableSwitchCaseCard: "Switch to case card view of the data",
    tableDatasetInfoButton: "Display information about dataset",
    tableResizeButton: "Resize all columns to fit data",
    tableDeleteCasesButton: "Delete selected or unselected cases",
    tableHideShowButton: "Show all cases or hide selected/unselected cases",
    tableAttributesButton: "Make new attributes. Export case data."
  },
  getComponentSelector(component) {
    let el = ""
    switch (component) {
      case "graph":
        el = ".codap-graph"
        break
      case "slider":
        el = ".codap-slider"
        break
      case "calculator":
        el = ".codap-component.calculator"
        break
      case "table":
        el = ".codap-case-table"
        break
      case "data-summary":
        el = ".codap-data-summary"
        break
    }
    return cy.get(el)
  },
  getToolshelfSelector(component) {
    let el = ""
    switch (component) {
      case "graph":
        el = "[data-testid=tool-shelf-button-Graph]"
        break
      case "slider":
        el = "[data-testid=tool-shelf-button-Slider]"
        break
      case "calculator":
        el = "[data-testid=tool-shelf-button-Calc]"
        break
      case "table":
        el = "[data-testid=tool-shelf-button-table]"
        break
    }
    return cy.get(el)
  },
  getComponentTile(component, index = 0) {
    return this.getComponentSelector(component).then(element => {
      return element.eq(index)
    })
  },
  getComponentTitle(component, index = 0) {
    return this.getComponentTile(component, index).find("[data-testid=editable-component-title]")
  },
  changeComponentTitle(component, title, index = 0) {
    this.getComponentTitle(component, index).click().find("input").type(`${title}{enter}`)
  },
  getInspectorPanel() {
    return cy.get("[data-testid=inspector-panel]")
  },
  getMinimizeButton(component, index = 0) {
    return this.getComponentTile(component, index).find("[data-testid=component-minimize-icon]")
  },
  getCloseButton(component, index = 0) {
    return this.getComponentTile(component, index).find("[data-testid=component-close-button]")
  },
  checkToolTip(element, tooltipText) {
    cy.wrap(element).invoke("attr", "title").should("contain", tooltipText)
  },
  createFromToolshelf(component) {
    this.getToolShelfIcon(component).click()
  },
  getToolShelfIcon(component) {
    return this.getToolshelfSelector(component)
  },
  selectTile(component, index = 0) {
    this.getComponentTile(component, index).click()
  },
  checkComponentDoesNotExist(component) {
    this.getComponentSelector(component).should("not.exist")
  },
  checkComponentExists(component) {
    this.getComponentSelector(component).should("exist")
  },
  closeComponent(component, index = 0) {
    this.selectTile(component, index)
    this.getCloseButton(component, index).click({ force: true })
  }
}
