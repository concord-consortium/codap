import { ComponentElements as c } from "../support/elements/component-elements"
import { GraphTileElements as graph } from "../support/elements/graph-tile"
import { AxisHelper as axis } from "../support/helpers/axis-helper"
import { GraphLegendHelper as legend } from "../support/helpers/graph-legend-helper"

describe("Graph resize handle clearance", () => {
  beforeEach(() => {
    cy.visit(`${Cypress.config("index")}?sample=mammals&dashboard&mouseSensor&suppressUnsavedWarning`)
    axis.openAxisAttributeMenu("bottom")
    axis.selectMenuAttribute("LifeSpan", "bottom")
    axis.verifyAxisLabel("bottom", "LifeSpan")
  })

  // The handle's painted triangle fills x + y >= 24 within its 24px square. A text bounding box
  // includes some empty space below the digits, so allow 3px of overlap with the box.
  const expectLegendMaxClearOfHandle = () => {
    graph.getGraphTile().parent().should($container => {
      const label = $container.find(".legend-axis-label text").last()[0]
      const handle = $container.find(".component-resize-handle")[0]
      expect(label?.textContent, "legend maximum label").to.equal("110")
      expect(handle, "resize handle").to.not.equal(undefined)
      const labelBounds = label.getBoundingClientRect()
      const handleBounds = handle.getBoundingClientRect()
      const overlap = Math.min(labelBounds.right, handleBounds.right) - handleBounds.left
      expect(overlap, "label reaches over the handle").to.be.greaterThan(0)
      const paintedTop = handleBounds.bottom - overlap
      expect(labelBounds.bottom, "label bottom").to.be.lessThan(paintedTop + 3)
    })
  }

  it("keeps the numeric legend's maximum label clear of the resize handle", () => {
    legend.dragAttributeToPlot("Speed")
    graph.getGraphTile().find(".component-title-bar").click()
    expectLegendMaxClearOfHandle()

    c.getResizeControl("graph").focus().type("{leftarrow}{leftarrow}{uparrow}{uparrow}")
    expectLegendMaxClearOfHandle()
  })

  it("uses the full graph height without a legend", () => {
    graph.getGraphTile().find(".graph-plot").should($plot => {
      const plotBottom = $plot[0].getBoundingClientRect().bottom
      const axisBottom = $plot.find(".axis-wrapper.bottom .axis-background")[0].getBoundingClientRect().bottom
      expect(axisBottom).to.be.closeTo(plotBottom, 1)
    })
  })
})
