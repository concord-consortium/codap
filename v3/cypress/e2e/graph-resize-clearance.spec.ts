import { GraphLegendHelper as legend } from "../support/helpers/graph-legend-helper"
import { GraphTileElements as graph } from "../support/elements/graph-tile"
import { AxisHelper as axis } from "../support/helpers/axis-helper"

describe("Graph resize handle clearance", () => {
  beforeEach(() => {
    cy.visit(`${Cypress.config("index")}?sample=mammals&dashboard&mouseSensor&suppressUnsavedWarning`)
  })

  // The handle's light-blue triangle occupies x + y >= 24 within its 24px SVG.
  // SVG text bounds include a little space below the visible numeral glyphs. Allow 2px for that
  // space; 8px of layout clearance still fails this check, while the visibly clear 10px setting passes.
  const expectClearOfResizeGraphic = (labelSelector: string) => {
    graph.getGraphTile().find(labelSelector).last().then($label => {
      const labelBounds = $label[0].getBoundingClientRect()
      graph.getGraphTile().parent().find(".component-resize-handle").then($handle => {
        const handleBounds = $handle[0].getBoundingClientRect()
        const rightmostOverlap = Math.min(labelBounds.right, handleBounds.right) - handleBounds.left
        expect(labelBounds.left, `${labelSelector} left`).to.be.lessThan(handleBounds.right)
        expect(rightmostOverlap, `${labelSelector} horizontal overlap`).to.be.greaterThan(0)
        const paintedTop = handleBounds.bottom - rightmostOverlap
        expect(labelBounds.bottom, `${labelSelector} bottom`).to.be.lessThan(paintedTop + 2)
      })
    })
  }

  it("clears the numeric legend maximum and reserves space for a numeric x-axis", () => {
    axis.openAxisAttributeMenu("bottom")
    axis.selectMenuAttribute("LifeSpan", "bottom")
    axis.verifyAxisLabel("bottom", "LifeSpan")
    legend.dragAttributeToPlot("Speed")
    graph.getGraphTile().find(".component-title-bar").click()
    graph.getGraphTile().find(".legend-axis-label text").last().should("have.text", "110")
    expectClearOfResizeGraphic(".legend-axis-label text")

    graph.getGraphTile().parent().find(".component-resize-button")
      .focus().type("{leftarrow}{leftarrow}{uparrow}{uparrow}")
    expectClearOfResizeGraphic(".legend-axis-label text")

    legend.openLegendMenu()
    legend.removeAttributeFromLegend("Speed")
    graph.getGraphTile().find("[data-testid=axis-bottom] .tick text").last().should("exist")
      .then($tick => {
        const tickBounds = $tick[0].getBoundingClientRect()
        graph.getGraphTile().parent().find(".component-resize-handle").then($handle => {
          const handleBounds = $handle[0].getBoundingClientRect()
          const rightmostOverlap = Math.min(tickBounds.right, handleBounds.right) - handleBounds.left
          const horizontalOverlap = Math.min(tickBounds.right, handleBounds.right) -
            Math.max(tickBounds.left, handleBounds.left)
          const paintedTop = handleBounds.bottom - rightmostOverlap
          // A tick outside the handle horizontally is already clear. If it moves over the handle, it must
          // remain above the painted triangle. The 2px allowance matches the legend text check.
          const intersectsPaint = horizontalOverlap > 0 && tickBounds.top < handleBounds.bottom &&
            tickBounds.bottom >= paintedTop + 2
          expect(intersectsPaint, "x-axis maximum tick intersects resize graphic").to.equal(false)
        })
      })
    graph.getGraphTile().find(".graph-plot").then($plot => {
      const plotBottom = $plot[0].getBoundingClientRect().bottom
      graph.getGraphTile().find(".axis-wrapper.bottom .axis-background").then($axisBackground => {
        const axisBottom = $axisBackground[0].getBoundingClientRect().bottom
        expect(plotBottom - axisBottom).to.be.closeTo(10, 1)
      })
    })
  })

  it("uses the full graph height for a categorical bottom axis without a legend", () => {
    cy.dragAttributeToTarget("table", "Diet", "bottom")
    graph.getGraphTile().find(".graph-plot").then($plot => {
      const plotBottom = $plot[0].getBoundingClientRect().bottom
      graph.getGraphTile().find(".axis-wrapper.bottom .axis-background").then($axisBackground => {
        const axisBottom = $axisBackground[0].getBoundingClientRect().bottom
        expect(axisBottom).to.be.closeTo(plotBottom, 1)
      })
    })
  })
})
