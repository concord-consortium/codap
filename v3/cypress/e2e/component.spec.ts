import { ComponentElements as c } from "../support/elements/component-elements"

context("Component UI", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&suppressUnsavedWarning"
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
  it("resizes components with keyboard arrow keys", () => {
    c.getComponentTile("table").parent().then($tileEl => {
      const tileEl = $tileEl[0]

      // Focus the tile first, then focus the resize button
      c.getComponentTitleBar("table").trigger("click", { force: true })
      cy.wait(100)
      c.getResizeControl("table").focus()
      cy.wait(100)

      // Press ArrowRight to increase width
      let widthBefore: number
      cy.then(() => {
        widthBefore = tileEl.getBoundingClientRect().width
      })
      c.getResizeControl("table").type("{rightarrow}{rightarrow}{rightarrow}")
      cy.wait(100)

      cy.then(() => {
        const widthAfter = tileEl.getBoundingClientRect().width
        expect(widthAfter).to.be.greaterThan(widthBefore)
        widthBefore = widthAfter
      })

      // Press ArrowLeft to decrease width
      c.getResizeControl("table").type("{leftarrow}{leftarrow}{leftarrow}")
      cy.wait(100)

      cy.then(() => {
        const widthAfter = tileEl.getBoundingClientRect().width
        expect(widthAfter).to.be.lessThan(widthBefore)
      })

      // Press ArrowDown to increase height
      let heightBefore: number
      cy.then(() => {
        heightBefore = tileEl.getBoundingClientRect().height
      })
      c.getResizeControl("table").type("{downarrow}{downarrow}{downarrow}")
      cy.wait(100)

      cy.then(() => {
        const heightAfter = tileEl.getBoundingClientRect().height
        expect(heightAfter).to.be.greaterThan(heightBefore)
        heightBefore = heightAfter
      })

      // Press ArrowUp to decrease height
      c.getResizeControl("table").type("{uparrow}{uparrow}{uparrow}")
      cy.wait(100)

      cy.then(() => {
        const heightAfter = tileEl.getBoundingClientRect().height
        expect(heightAfter).to.be.lessThan(heightBefore)
      })
    })
  })
  it("focuses tile when resize button receives focus", () => {
    // Blur the table first
    c.getComponentTitleBar("text").trigger("click", { force: true })
    c.getComponentTile("table").should("not.have.class", "focused")

    // Focus the resize button
    c.getResizeControl("table").focus()
    cy.wait(100)
    c.getComponentTile("table").should("have.class", "focused")
  })
  it("shows focus ring on title bar buttons when focused via keyboard", () => {
    // Click the title bar to place focus near the buttons
    c.getComponentTitleBar("table").click({ force: true })
    // Place focus on the minimize button
    c.getMinimizeButton("table").focus()
    c.getMinimizeButton("table").should("have.css", "outline-style", "solid")
    cy.realPress("ArrowRight")
    c.getCloseButton("table").should("have.focus")
    c.getCloseButton("table").should("have.css", "outline-style", "solid")
  })
  it("enters title edit mode via keyboard and returns focus after Escape", () => {
    c.getComponentTitle("table").focus()
    c.getComponentTitle("table").should("have.focus")
    cy.realPress("Enter")
    c.getComponentTitleInput("table").should("exist").and("have.focus")
    cy.realPress("Escape")
    c.getComponentTitleInput("table").should("not.exist")
    c.getComponentTitle("table").should("have.focus")
  })
  it("enters title edit mode via keyboard and returns focus after Enter submit", () => {
    c.getComponentTitle("table").focus()
    cy.realPress("Enter")
    c.getComponentTitleInput("table").should("exist").and("have.focus")
    c.getComponentTitleInput("table").type("New Title{enter}")
    c.getComponentTitleInput("table").should("not.exist")
    c.getComponentTitle("table").should("have.focus")
  })
  it("does not navigate toolbar with arrow keys while editing title", () => {
    // Enter edit mode
    c.getComponentTitle("table").focus()
    cy.realPress("Enter")
    c.getComponentTitleInput("table").should("exist").and("have.focus")
    // Arrow keys should move cursor in the input, not navigate the toolbar
    cy.realPress("ArrowRight")
    c.getComponentTitleInput("table").should("have.focus")
    c.getMinimizeButton("table").should("not.have.focus")
    cy.realPress("ArrowLeft")
    c.getComponentTitleInput("table").should("have.focus")
  })
  it("puts tile in focus when the tile's resize elements are clicked", () => {
    c.getComponentTile("table").should("not.have.class", "focused")
    c.getResizeControl("table").trigger("pointerdown")
    c.getComponentTile("table").should("have.class", "focused")

    c.getComponentTile("table").parent().invoke("attr", "id").then((tableId) => {
      if (!tableId) throw new Error("Table tile has no ID.")

      c.getComponentTitleBar("text").trigger("click") // blur table
      c.getComponentTile("table").should("not.have.class", "focused")
      c.getResizeBorder(tableId, "left").trigger("pointerdown")
      c.getComponentTile("table").should("have.class", "focused")

      c.getComponentTitleBar("text").trigger("click") // blur table
      c.getComponentTile("table").should("not.have.class", "focused")
      c.getResizeBorder(tableId, "right").trigger("pointerdown")
      c.getComponentTile("table").should("have.class", "focused")

      c.getComponentTitleBar("text").trigger("click") // blur table
      c.getComponentTile("table").should("not.have.class", "focused")
      c.getResizeBorder(tableId, "bottom").trigger("pointerdown")
      c.getComponentTile("table").should("have.class", "focused")
    })
  })
})
