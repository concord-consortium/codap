import { TableTileElements as table } from "../support/elements/table-tile"
import { CfmElements as cfm } from "../support/elements/cfm"

context("attribute types", () => {
  beforeEach(() => {
    const filename = "cypress/fixtures/attribute-types.codap"
    const url = `${Cypress.config("index")}?suppressUnsavedWarning`
    cy.visit(url)
    cy.wait(3000)
    cfm.openLocalDocWithUserEntry(filename)
  })

  describe("attribute types are rendered correctly", () => {
    it("verify string", () => {
      table.getCell("2", "2").should("contain", "Arizona")
    })
    it("verify numerical", () => {
      table.getCell("3", "2").should("contain", "48")
    })
    it("verify date", () => {
      table.getCell("4", "2").should("contain", "8/7/2017, 12:01 PM")
      table.getCell("4", "3").should("contain", "6/15/1966")
      table.getCell("4", "4").should("contain", "12/7/1787")
      table.getCell("4", "5").should("contain", "1/2/2003")
      table.getCell("4", "6").should("contain", "12/3/1818")
      table.getCell("4", "7").should("contain", "6/1/1992")
      table.getCell("4", "8").should("contain", "11/2/1989")
      table.getCell("4", "9").should("contain", "11/16/2007")
      table.getCell("4", "10").should("contain", "11/30/2000")
    })
    it.skip("verify boolean", () => {
      table.getCell("5", "2").should("contain", "false")
    })
    it.skip("verify qualitative", () => {
      table.getCell("6", "2").find("span span").should("have.class", "dg-qualitative-bar")
    })
    it.skip("verify color", () => {
      table.getCell("7", "2").find("span").should("have.class", "dg-color-table-cell")
    })
    it.skip("verify bounds", () => {
      cy.wait(1500)
      table.getCell("9", "2").find("span").should("have.class", "dg-boundary-thumb")
    })
    it.skip("verify invalid type", () => {
      table.getCell("10", "2").should("contain", "❌: invalid type(s) for '*'")
    })
    it.skip("verify unrecognized", () => {
      table.getCell("11", "2").should("contain", "❌: 'Bool|color' is unrecognized")
    })
  })
})
