import {TableTileElements as table} from "../support/elements/TableTile"
import {CfmElements as cfm} from "../support/elements/CfmObject"

context("attribute types", () => {
    before(() => {
        const filename = "cypress/fixtures/attribute-types-test-document.codap"
        cy.visit("")
        cy.wait(3000)
        cfm.openLocalDoc(filename)
    })

    describe("attribute types are rendered correctly", () => {
        it("verify string", () => {
            table.getCell("2", "2").should("contain", "Arizona")
        })
        it("verify numerical", () => {
            table.getCell("3", "2").should("contain", "48")
        })
        it("verify date", () => {
            table.getCell("4", "2").should("contain", "8/7/2017 12:01 PM")
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
            table.getCell("10", "2").should("contain","❌: invalid type(s) for '*'")
        })
        it.skip("verify unrecognized", () => {
            table.getCell("11", "2").should("contain",  "❌: 'Bool|color' is unrecognized")
        })
    })
})
