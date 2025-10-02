import { ToolbarElements as toolbar } from "./toolbar-elements"

export const ComponentElements = {
  tooltips: {
    tableToolShelfIcon: "Open a case table for each data set",
    graphToolShelfIcon: "Make a graph",
    mapToolShelfIcon: "Make a map",
    sliderToolShelfIcon: "Make a slider",
    calculatorToolShelfIcon: "Open/close the calculator",
    minimizeComponent: "Minimize or expand this Component",
    closeComponent: "Close this Component",
    inspectorPanel: "Change what is shown along with the points",
    sliderInspectorPanel: "Set slider animation direction, speed, …",
    graphResizeButton: "Move the points to new random positions",
    graphHideShowButton: "Show all cases or hide selected/unselected cases",
    graphDisplayValuesButton: "Change what is shown along with the points",
    graphDisplayConfigButton: "Configure the display differently",
    graphDisplayStylesButton: "Change the appearance of the display",
    graphCameraButton: "Save the image",
    mapZoomInButton: "Zoom in",
    mapZoomOutButton: "Zoom out",
    mapResizeButton: "Rescale display to show all the data",
    mapHideShowButton: "Show all cases or hide selected/unselected cases",
    mapDisplayValuesButton: "Change what is shown along with the points",
    mapDisplayConfigButton: "Change the appearance of the map layers",
    mapCameraButton: "Save the image",
    tableSwitchCaseCard: "Switch to case card view of the data",
    tableDatasetInfoButton: "Display information about dataset",
    tableResizeButton: "Resize all columns to fit data",
    tableDeleteCasesButton: "Delete selected or unselected cases",
    tableHideShowButton: "Show all cases or hide selected/unselected cases",
    tableRulerButton: "Make new attributes. Export case data."
  },
  getComponentSelector(component: string) {
    return cy.get(`.codap-component[data-testid$=${component}]`)
  },
  getComponentTile(component: string, index = 0) {
    // This was using a then, but that prevents retrying the chain
    // queries after this one.
    // If we want to explicitly prevent retrying we should make that
    // explicit in the method name.
    return this.getComponentSelector(component).eq(index)
  },
  getComponentTitleBar(component: string, index = 0) {
    return this.getComponentTile(component, index).find(".component-title-bar")
  },
  checkComponentFocused(component: string, focused = true, index = 0) {
    const check = `${focused ? "" : "not."}have.class`
    this.getComponentTitleBar(component, index).should(check, "focusTile")
  },
  getComponentTitle(component: string, index = 0) {
    return this.getComponentTile(component, index).find("[data-testid=title-text]")
  },
  getComponentTitleInput(component: string, index = 0) {
    return this.getComponentTile(component, index).find("[data-testid=title-text-input]")
  },
  changeComponentTitle(component: string, title: string, index = 0) {
    this.getComponentTitle(component, index).click()
    cy.get("[data-testid=title-text-input]").type(`${title}{enter}`)
  },
  getInspectorPanel() {
    return cy.get("[data-testid=inspector-panel]")
  },
  getMinimizeButton(component: string, index = 0) {
    return this.getComponentTile(component, index).find("[data-testid=component-minimize-button]")
  },
  getCloseButton(component: string, index = 0) {
    return this.getComponentTile(component, index).find("[data-testid=component-close-button]")
  },
  getResizeControl(component: string, index = 0) {
    return this.getComponentTile(component, index).parent().find(".codap-component-corner.bottom-right")
  },
  checkToolTip(element: JQuery<HTMLElement>, tooltipText: string) {
    cy.wrap(element).invoke("attr", "title").should("contain", tooltipText)
  },
  getIconFromToolShelf(component: string) {
    return toolbar.getToolShelfIcon(component)
  },
  clickIconFromToolShelf(component: string) {
    this.getIconFromToolShelf(component).click()
    // Without this wait(), visibility tests intermittently fail because the tile
    // has zero width and/or height initially before animating to its final size.
    cy.wait(100)
  },
  selectTile(component: string, index = 0) {
    cy.get(".codap-container").click("bottom", { force: true })
    this.getComponentTile(component, index).click("top", { force: true })
  },
  checkComponentDoesNotExist(component: string) {
    this.getComponentSelector(component).should("not.exist")
  },
  checkComponentExists(component: string) {
    this.getComponentSelector(component).should("exist")
  },
  moveComponent(component: string, x: number, index = 0) {
    this.getComponentTitle(component, index)
      .trigger("mousedown", { force: true })
      .wait(100)
      .trigger("mousemove", {force: true, clientX: x})
      .wait(100)
      .trigger("mouseup", { force: true })
  },
  closeComponent(component: string, index = 0) {
    if (component === "slider") {
      // Change in component header height causes interference with variable value input
      this.getComponentTile("slider").then($tile => {
        cy.wrap($tile).find("[data-testid=component-close-button]").click("top", { force: true })
      })
    }
    else {
      this.selectTile(component, index)
      this.getCloseButton(component, index).click({ force: true })
    }
  }
}
