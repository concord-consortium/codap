import { SliderTileElements as slider } from "../support/elements/slider-tile"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"

const params = "?sample=mammals&dashboard&mouseSensor&suppressUnsavedWarning&features=visibilitySlider"

// Sleep ranges over [2, 20] in the Mammals sample, so the configured range starts at [2, 3.8]
function setupRangeSlider() {
  cy.visit(`${Cypress.config("index")}${params}`)
  // the slider's value reads 0 briefly before the document's 0.5 is applied
  cy.get('.codap-case-table [data-testid="codap-attribute-button Sleep"]').should("be.visible")
  slider.getVariableValue().should("eq", "0.5")
  cy.dragAttributeToTarget("table", "Sleep", "slider")
  slider.getRangeLowInput().should("have.value", "2")
}

// the handles are native range inputs, so their value is the handle's value
const valueOf = ($input: JQuery<HTMLElement>) => Number($input.val())

// Drags from the element's center by dx with the button held. cypress-real-events' realMouseMove sends its
// move with no buttons pressed, which releases pointer capture, so dispatch the pointer events directly.
function dragBy($el: JQuery<HTMLElement>, dx: number, { shiftKey = false } = {}) {
  const rect = $el[0].getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const pointer = {
    eventConstructor: "PointerEvent", pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0, force: true,
    shiftKey
  }
  cy.wrap($el).trigger("pointerdown", { ...pointer, buttons: 1, clientX: x, clientY: y })
  for (let step = 1; step <= 4; ++step) {
    cy.wrap($el).trigger("pointermove", { ...pointer, buttons: 1, clientX: x + dx * step / 4, clientY: y })
  }
  cy.wrap($el).trigger("pointerup", { ...pointer, buttons: 0, clientX: x + dx, clientY: y })
}

context("Slider range thumb", () => {
  it("shows a handle at each end of the range", () => {
    setupRangeSlider()
    slider.getRangeLowInput().should("exist")
    slider.getRangeHighInput().should("exist")
    // the input shows React Aria's value, rounded to its step (about one pixel of data)
    slider.getRangeHighInput().should($high => expect(valueOf($high)).to.be.closeTo(3.8, 0.1))
  })

  it("shows the range's ends in place of the variable's name and value", () => {
    setupRangeSlider()
    slider.getSliderTile().find('[data-testid="slider-range-values"]')
      .invoke("text").should("match", /visible value\(s\)\s*=\s*2\s*-\s*3\.8/)
    slider.getSliderTile().find('[data-testid="slider-variable-name"]').should("not.exist")
  })

  it("labels the axis with the bound attribute's name", () => {
    setupRangeSlider()
    slider.getSliderTile().find('[data-testid="slider-attribute-label"]').should("have.text", "Sleep")
  })

  // a configured range starts at the axis min, where the axis end marker must not cover the low handle
  it("paints each handle over what's beneath it, even at the axis ends", () => {
    setupRangeSlider()
    for (const testId of ["slider-range-low", "slider-range-high", "slider-range-body"]) {
      slider.getSliderTile().find(`[data-testid="${testId}"]`).then($el => {
        const rect = $el[0].getBoundingClientRect()
        const topElt = $el[0].ownerDocument.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
        expect($el[0].contains(topElt), testId).to.equal(true)
      })
    }
  })

  it("resizes from the keyboard without moving the other end", () => {
    setupRangeSlider()
    slider.getRangeHighInput().focus()
    cy.realPress("ArrowRight")
    slider.getRangeHighInput().should($high => expect(valueOf($high)).to.be.greaterThan(3.8))
    slider.getRangeLowInput().should("have.value", "2")
  })

  it("collapses to a value in the data when one edge is dragged onto the other", () => {
    setupRangeSlider()
    slider.getRangeLowInput().parent().then($handle => dragBy($handle, 200))
    // The handles are drawn from the model, so a collapsed range puts them side by side, forming one thumb.
    // (The inputs show React Stately's step-rounded values, which can differ by a step for a collapsed range.)
    // .should(callback) retries until React has rendered the committed range.
    slider.getSliderTile().should($tile => {
      const lowRect = $tile.find('[data-testid="slider-range-low"]')[0].getBoundingClientRect()
      const highRect = $tile.find('[data-testid="slider-range-high"]')[0].getBoundingClientRect()
      expect(highRect.left).to.be.closeTo(lowRect.right, 0.5)
    })
    // a collapsed range shows its one value; every Sleep value in the Mammals sample is a multiple of 0.1
    slider.getSliderTile().find('[data-testid="slider-range-values"] .range-text').should($text => {
      expect($text.text()).not.to.contain("-")
      const low = Number($text.text())
      expect(low).to.be.greaterThan(2)
      expect(Math.round(low * 10) / 10).to.be.closeTo(low, 1e-9)
    })
  })

  it("ignores a right-button press on the middle, and moves without a button held", () => {
    setupRangeSlider()
    slider.getRangeBody().then($body => {
      const rect = $body[0].getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      const pointer = { eventConstructor: "PointerEvent", pointerId: 1, pointerType: "mouse", isPrimary: true,
                        force: true, clientY: y }
      // a right press (e.g. opening a context menu) whose pointerup never arrives, then plain hover moves
      cy.wrap($body).trigger("pointerdown", { ...pointer, button: 2, buttons: 2, clientX: x })
      cy.wrap($body).trigger("pointermove", { ...pointer, button: -1, buttons: 0, clientX: x + 80 })
    })
    // asserting that nothing happened, so give a (wrong) move time to render before checking
    cy.wait(300)
    slider.getRangeLowInput().should("have.value", "2")
  })

  it("moves the whole range when the middle is dragged, keeping its width, and undoes in one step", () => {
    setupRangeSlider()
    slider.getRangeBody().then($body => dragBy($body, 80))
    // .should(callback) retries until React has rendered the committed range
    slider.getSliderTile().should($tile => {
      const low = valueOf($tile.find('[data-testid="slider-range-low"] input'))
      const high = valueOf($tile.find('[data-testid="slider-range-high"] input'))
      expect(low).to.be.greaterThan(2)
      expect(high - low).to.be.closeTo(1.8, 0.1)
    })
    toolbar.getUndoTool().click()
    slider.getRangeLowInput().should("have.value", "2")
  })

  it("changes nothing when a handle is pressed and released without moving", () => {
    setupRangeSlider()
    slider.getRangeHighInput().parent().then($handle => {
      const rect = $handle[0].getBoundingClientRect()
      const pointer = { eventConstructor: "PointerEvent", pointerId: 1, pointerType: "mouse", isPrimary: true,
                        button: 0, force: true,
                        clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }
      cy.wrap($handle).trigger("pointerdown", { ...pointer, buttons: 1 })
      cy.wrap($handle).trigger("pointerup", { ...pointer, buttons: 0 })
    })
    // one undo reverts the attribute drop itself, so the press added no change of its own
    toolbar.getUndoTool().click()
    slider.getSliderTile().find('[data-testid="slider-range-values"]').should("not.exist")
    slider.getSliderTile().find('[data-testid="slider-variable-name"]').should("exist")
  })

  describe("a collapsed range", () => {
    const rangeText = () => slider.getSliderTile().find('[data-testid="slider-range-values"] .range-text')
    // collapses the range by dragging its low edge onto the high one, and yields the collapsed value
    function collapseRange() {
      setupRangeSlider()
      slider.getRangeLowInput().parent().then($handle => dragBy($handle, 200))
      return rangeText().should($text => expect($text.text()).not.to.contain("-"))
        .then($text => Number($text.text()))
    }
    // a collapsed value is one of the data's; every Sleep value in the Mammals sample is a multiple of 0.1
    const expectCollapsedOnData = ($text: JQuery<HTMLElement>) => {
      expect($text.text()).not.to.contain("-")
      const value = Number($text.text())
      expect(Math.round(value * 10) / 10).to.be.closeTo(value, 1e-9)
      return value
    }

    it("moves as one thumb when either half is dragged, snapping to the data", () => {
      collapseRange().then(collapsed => {
        // the high half dragged left, which would otherwise try to push it past the low half
        slider.getRangeHighInput().parent().then($handle => dragBy($handle, -80))
        rangeText().should($text => expect(expectCollapsedOnData($text)).to.be.lessThan(collapsed))
      })
      rangeText().then($text => Number($text.text())).then(moved => {
        slider.getRangeLowInput().parent().then($handle => dragBy($handle, 80))
        rangeText().should($text => expect(expectCollapsedOnData($text)).to.be.greaterThan(moved))
      })
    })

    it("undoes a move in one step", () => {
      collapseRange().then(collapsed => {
        slider.getRangeHighInput().parent().then($handle => dragBy($handle, 80))
        rangeText().should($text => expect(expectCollapsedOnData($text)).to.be.greaterThan(collapsed))
        toolbar.getUndoTool().click()
        rangeText().should($text => expect(Number($text.text())).to.equal(collapsed))
      })
    })

    it("widens from the dragged edge when a half is shift-dragged", () => {
      collapseRange().then(collapsed => {
        slider.getRangeLowInput().parent().then($handle => dragBy($handle, -80, { shiftKey: true }))
        rangeText().should($text => {
          const [low, high] = $text.text().split("-").map(Number)
          expect(low).to.be.lessThan(collapsed)
          expect(high).to.equal(collapsed)
        })
      })
    })
  })
})
