import { ComponentElements as c } from "../support/elements/component-elements"

context("Component UI", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })

  it("moves components by dragging", () => {
    // move the table
    c.getComponentTile("table").then($tileEl => {
      const tileEl = $tileEl[0]
      const tileInitial = tileEl.getBoundingClientRect()

      c.getComponentTitleBar("table").trigger("pointerdown").then($titleEl => {
        const titleEl = $titleEl[0]
        const titleInitial = titleEl.getBoundingClientRect()
        const startX = titleInitial.left + titleInitial.width / 2
        const startY = titleInitial.top + titleInitial.height / 2

        const offsetX = 100 // desired horizontal movement
        const offsetY = 100 // desired vertical movement
        const pageX = startX + offsetX
        const pageY = startY + offsetY
        cy.wrap($titleEl).trigger("pointermove", { pageX, pageY, force: true }).then(() => {
          cy.wait(100)
          cy.wrap($titleEl).trigger("pointerup", { pageX, pageY, force: true }).then(() => {
            const tileFinal = tileEl.getBoundingClientRect()
            expect(tileFinal.left).to.be.greaterThan(tileInitial.left)
            expect(tileFinal.top).to.be.greaterThan(tileInitial.top)
          })
        })
      })
    })
  })
  it("resizes components by dragging", () => {
    // resize the table
    c.getComponentTile("table").then($tileEl => {
      const tileEl = $tileEl[0]
      const tileInitial = tileEl.getBoundingClientRect()

      c.getComponentTitleBar("table").trigger("click", { force: true }).then(() => {
        cy.wait(100)
        c.getResizeControl("table").trigger("pointerdown").then($resizeEl => {
          const resizeEl = $resizeEl[0]
          const resizeInitial = resizeEl.getBoundingClientRect()
          const startX = resizeInitial.left + resizeInitial.width / 2
          const startY = resizeInitial.top + resizeInitial.height / 2

          const offsetX = 100 // desired horizontal movement
          // TODO: for some reason, resize doesn't work vertically
          const offsetY = 0   // desired vertical movement
          const clientX = startX + offsetX
          const clientY = startY + offsetY
          // note that pointer events are handled by document.body
          cy.get("body").trigger("pointermove", { clientX, clientY, force: true }).then(() => {
            cy.wait(100)
            cy.get("body").trigger("pointerup", { force: true }).then(() => {
              const tileFinal = tileEl.getBoundingClientRect()
              expect(tileFinal.width).to.be.greaterThan(tileInitial.width)
              // expect(tileFinal.height).to.be.greaterThan(tileInitial.height)
            })
          })
        })
      })
    })
  })
})
