context("Test the overall app", () => {
  beforeEach(() => {
    cy.visit("")
  })

  describe("Desktop functionalities", () => {
    it("renders with text", () => {
      cy.get(".app").should("contain.text", "Hello CODAP3!")
    })
  })
})
