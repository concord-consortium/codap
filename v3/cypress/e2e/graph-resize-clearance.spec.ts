import { ComponentElements as c } from "../support/elements/component-elements"
import { GraphTileElements as graph } from "../support/elements/graph-tile"
import { AxisHelper as axis } from "../support/helpers/axis-helper"
import { GraphLegendHelper as legend } from "../support/helpers/graph-legend-helper"

describe("Graph resize handle clearance", () => {
  const visitSample = (sample: string) => {
    cy.visit(`${Cypress.config("index")}?sample=${sample}&dashboard&mouseSensor&suppressUnsavedWarning`)
  }

  const putOnBottomAxis = (name: string) => {
    axis.openAxisAttributeMenu("bottom")
    axis.selectMenuAttribute(name, "bottom")
    axis.verifyAxisLabel("bottom", name)
  }

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
    visitSample("mammals")
    putOnBottomAxis("LifeSpan")
    legend.dragAttributeToPlot("Speed")
    graph.getGraphTile().find(".component-title-bar").click()
    expectLegendMaxClearOfHandle()

    c.getResizeControl("graph").focus().type("{leftarrow}{leftarrow}{uparrow}{uparrow}")
    expectLegendMaxClearOfHandle()
  })

  it("shortens the bottom-axis title only when it would reach the resize handle", () => {
    visitSample("mammals")
    putOnBottomAxis("LifeSpan")
    graph.getGraphTile().find(".component-title-bar").click()

    // 22 steps of 20px narrow the tile from 580px to 140px
    c.getResizeControl("graph").focus().type("{leftarrow}".repeat(22))
    graph.getGraphTile().parent().should($container => {
      const title = $container.find(".axis-wrapper.bottom text.attribute-label")[0]
      const arrow = $container.find(".axis-wrapper.bottom .attribute-label-arrow path")[0]
      const handle = $container.find(".component-resize-handle")[0]
      expect(title?.textContent, "shortened title").to.match(/…$/)
      expect(arrow.getBoundingClientRect().right, "arrow right")
        .to.be.at.most(handle.getBoundingClientRect().left)
      expect(Cypress.$(title).parent().children("title").text(), "hover text").to.equal("LifeSpan")
    })

    // with a legend, the title is above the legend and is not shortened
    legend.dragAttributeToPlot("Speed")
    axis.verifyAxisLabel("bottom", "LifeSpan")
  })

  it("uses the full graph height without a legend", () => {
    visitSample("mammals")
    putOnBottomAxis("LifeSpan")
    graph.getGraphTile().find(".graph-plot").should($plot => {
      const plotBottom = $plot[0].getBoundingClientRect().bottom
      const axisBottom = $plot.find(".axis-wrapper.bottom .axis-background")[0].getBoundingClientRect().bottom
      expect(axisBottom).to.be.closeTo(plotBottom, 1)
    })
  })
})
