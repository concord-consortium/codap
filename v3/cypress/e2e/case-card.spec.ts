import { TableTileElements as table } from "../support/elements/table-tile"

context("case card", () => {
  beforeEach(() => {
    // cy.scrollTo() doesn't work as expected with `scroll-behavior: smooth`
    const queryParams = "?sample=mammals&mouseSensor&scrollBehavior=auto"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2000)
  })

  const tableHeaderLeftSelector = ".codap-component.codap-case-table .component-title-bar .header-left"
  const cardHeaderLeftSelector = ".codap-component.codap-case-card .component-title-bar .header-left"

  describe("case card", () => {
    it("can switch from case table to case card view and back", () => {
      cy.get('[data-testid="codap-case-table"]').should("exist")
      cy.get('[data-testid="case-card"]').should("not.exist")
      cy.get(tableHeaderLeftSelector).click()
      cy.get(`${tableHeaderLeftSelector} .card-table-toggle-message`).click()
      cy.wait(500)
      cy.get('[data-testid="codap-case-table"]').should("not.exist")
      cy.get('[data-testid="card-view"]').should("exist")
      cy.get(cardHeaderLeftSelector).click()
      cy.wait(500)
      cy.get(`${cardHeaderLeftSelector} .card-table-toggle-message`).click()
      cy.get('[data-testid="codap-case-table"]').should("exist")
      cy.get('[data-testid="card-view"]').should("not.exist")
    })
    it("displays cases and allows user to scroll through them", () => {
      cy.get(tableHeaderLeftSelector).click()
      cy.get(`${tableHeaderLeftSelector} .card-table-toggle-message`).click()
      cy.wait(500)
      cy.get('[data-testid="case-view"]').should("have.length", 1)
      cy.get('[data-testid="case-view-title"]').should("have.text", "Cases")
      cy.get('[data-testid="case-view-previous-button"]').should("be.disabled")
      cy.get('[data-testid="case-view-next-button"]').should("not.be.disabled")
      cy.get('[data-testid="case-view-index"]').should("have.text", "1 of 27")
      cy.get('[data-testid="case-attr"]').should("have.length", 9)
      cy.get('[data-testid="case-attr-name"]').should("have.length", 9)
      cy.get('[data-testid="case-attr-value"]').should("have.length", 9)
      cy.get('[data-testid="case-attr-name"]').first().should("have.text", "Mammal")
      cy.get('[data-testid="case-attr-value"]').first().should("have.text", "African Elephant")
      cy.get('[data-testid="case-view-next-button"]').click()
      cy.get('[data-testid="case-attr-value"]').first().should("have.text", "Asian Elephant")
      cy.get('[data-testid="case-view-previous-button"]').should("not.be.disabled").click()
      cy.get('[data-testid="case-attr-value"]').first().should("have.text", "African Elephant")
    })
    it("displays case data in a hierachy when there is a parent collection", () => {
      // make a parent collection
      table.moveAttributeToParent("Order", "newCollection")
      cy.wait(500)
      cy.get(tableHeaderLeftSelector).click()
      cy.get(`${tableHeaderLeftSelector} .card-table-toggle-message`).click()
      cy.wait(500)
      cy.get('[data-testid="case-view"]').should("have.length", 2)
      cy.get('[data-testid="case-view"]').eq(0).should("have.class", "color-cycle-1")
      cy.get('[data-testid="case-view"]').eq(1).should("have.class", "color-cycle-2")
      cy.get('[data-testid="case-view-title"]').should("have.length", 2)
      cy.get('[data-testid="case-view-title"]').eq(0).should("have.text", "Orders")
      cy.get('[data-testid="case-view-title"]').eq(1).should("have.text", "Cases")
      cy.get('[data-testid="case-view-previous-button"]').should("have.length", 2).and("be.disabled")
      cy.get('[data-testid="case-view-next-button"]').should("have.length", 2).and("not.be.disabled")
      cy.get('[data-testid="case-view-index"]').should("have.length", 2)
      cy.get('[data-testid="case-view-index"]').eq(0).should("have.text", "1 of 12")
      cy.get('[data-testid="case-view-index"]').eq(1).should("have.text", "1 of 2")
      cy.get('[data-testid="case-attrs"]').should("have.length", 2)
      cy.get('[data-testid="case-attrs"]').eq(0).find('[data-testid="case-attr"]').should("have.length", 1)
      cy.get('[data-testid="case-attrs"]').eq(0).find('[data-testid="case-attr-name"]')
                                                  .eq(0).should("have.text", "Order")
      cy.get('[data-testid="case-attrs"]').eq(0).find('[data-testid="case-attr-value"]')
                                                  .eq(0).should("have.text", "Proboscidae")
      cy.get('[data-testid="case-attrs"]').eq(1).find('[data-testid="case-attr"]').should("have.length", 8)
      cy.get('[data-testid="case-attrs"]').eq(1).find('[data-testid="case-attr-value"]')
                                                  .eq(0).should("have.text", "African Elephant")
    })

  })
})
