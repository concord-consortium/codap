import {TableTileElements as table} from "../support/elements/TableTile"

const numOfAttributes = 10
const firstRowIndex = 2
let lastRowIndex = undefined
let middleRowIndex = undefined
let numOfCases = undefined

before(()=> {
    cy.visit("?sample=mammals")
    cy.wait(2000)
    table.getNumOfAttributes().should("equal", numOfAttributes.toString())
    table.getNumOfCases().then($cases => {
        numOfCases = $cases
        lastRowIndex = Number($cases)
        middleRowIndex = Math.floor(lastRowIndex/2)
    })
})

context("case table ui", () => {
    describe("table view", () => {
        const collectionName = "New Dataset"
        it("verify collection name is visible", () => {
            table.getCollectionTitle().should("have.value", collectionName)
        })
        it("verify columns and tooltips", () => {
            table.getColumnHeaders().should("have.length",10)
            table.getColumnHeader(0).invoke("text").then(columnName => {
                table.getColumnHeader(0).rightclick({force:true})
                table.getColumnHeaderTooltip().should("contain", columnName)
            })
            table.getColumnHeader(1).invoke("text").then(columnName => {
                table.getColumnHeader(1).rightclick({force:true})
                table.getColumnHeaderTooltip().should("contain", columnName)
            })
        })
        it("verify edit attribute properties", () => {
            const name = "Tallness",
                description = "The average height of the mammal.",
                unit="meters",
                newName = "Tallness (meters)",
                type = null,
                precision = null,
                editable = "False"
            table.editAttributeProperty("Height", name, description, type, unit, precision, editable)
            table.getAttribute(name).should("have.text", newName)
            table.getAttribute(name).rightclick({force:true})
            table.getColumnHeaderTooltip().should("contain", name + " : " + description)
        })
        // it("verify attribute reorder within a collection", () => {
        // });
        // it("verify index column cannot be reordered", () => {
        // });
    })

    describe("case table header attribute menu", () => {
        it("verify rename attribute", () => {
            table.getColumnHeader(1).should("have.text","Mammal")
            table.getAttribute("Mammal").should("exist")
            table.openAttributeMenu("Mammal")
            table.selectMenuItemFromAttributeMenu("Rename")
            table.renameColumnName(`Animal{enter}`)
            table.getColumnHeader(1).should("have.text","Animal")
            table.getAttribute("Animal").should("exist")
        })
        it("verify hide attribute", () => {
            table.openAttributeMenu("Animal")
            table.selectMenuItemFromAttributeMenu("Hide Attribute")
            table.getColumnHeader(1).should("not.have.text","Animal")
            table.getAttribute("Animal").should("not.exist")
        })
        it("verify show all attributes", () => {
            table.openAttributeMenu("Order")
            table.selectMenuItemFromAttributeMenu("Show All Attributes")
            table.getColumnHeader(1).should("have.text","Animal")
            table.getAttribute("Animal").should("exist")
        })
        it("verify delete attribute", () => {
            table.openAttributeMenu("Animal")
            table.selectMenuItemFromAttributeMenu("Delete Attribute")
            table.getColumnHeader(1).should("not.have.text","Animal")
            table.getAttribute("Animal").should("not.exist")
            table.getColumnHeaders().should("have.length",numOfAttributes-1)
        })
    })

    describe("index menu", () => {
        it("verify index menu insert case and delete case work", () => {
            table.openIndexMenuForRow(2)
            table.insertCase()
            table.openIndexMenuForRow(2)
            table.deleteCase()
        })
        it("verify insert cases before a row by typing num of cases", () => {
            table.openIndexMenuForRow(2)
            table.insertCases(2, "before")
            table.openIndexMenuForRow(2)
            table.deleteCase()
            table.openIndexMenuForRow(2)
            table.deleteCase()
        })
        it("verify insert cases after a row by typing num of cases", () => {
            table.openIndexMenuForRow(2)
            table.insertCases(2, "after")
            table.openIndexMenuForRow(3)
            table.deleteCase()
            table.openIndexMenuForRow(3)
            table.deleteCase()
        })
        it("verify index menu insert cases modal close", () => {
            table.openIndexMenuForRow(2)
            table.getIndexMenu().should("be.visible")
            cy.clickMenuItem("Insert Cases...")
            table.closeInsertCasesModal()
            table.getInsertCasesModalHeader().should("not.exist")
        })
        it("verify index menu insert cases modal cancel", () => {
            table.openIndexMenuForRow(2)
            table.getIndexMenu().should("be.visible")
            cy.clickMenuItem("Insert Cases...")
            table.cancelInsertCasesModal()
            table.getInsertCasesModalHeader().should("not.exist")
        })
        it("verify insert 1 case at the bottom", () => {
            table.getCaseTableGrid().scrollTo("bottom")
            table.openIndexMenuForRow(lastRowIndex)
            table.insertCase()
            table.getCaseTableGrid().scrollTo("bottom")
            cy.wait(500)
            table.openIndexMenuForRow(lastRowIndex)
            table.deleteCase()
            table.getNumOfCases().should("equal", numOfCases)
        })
        it("verify insert multiple cases below current case at the bottom", () => {
            table.getCaseTableGrid().scrollTo("bottom")
            table.openIndexMenuForRow(lastRowIndex)
            table.insertCases(2, "after")
            table.getCaseTableGrid().scrollTo("bottom")
            cy.wait(500)
            table.openIndexMenuForRow(lastRowIndex+1)
            table.deleteCase()
            table.openIndexMenuForRow(lastRowIndex+1)
            table.deleteCase()
            table.getNumOfCases().should("equal", numOfCases)
        })
        it("verify insert multiple cases above current case at the bottom", () => {
            table.getCaseTableGrid().scrollTo("bottom")
            table.openIndexMenuForRow(lastRowIndex)
            table.insertCases(2, "before")
            table.getCaseTableGrid().scrollTo("bottom")
            cy.wait(500)
            table.openIndexMenuForRow(lastRowIndex+1)
            table.deleteCase()
            table.openIndexMenuForRow(lastRowIndex)
            table.deleteCase()
            table.getNumOfCases().should("equal", numOfCases)
        })
        it("verify delete last case", () => {
            table.getCaseTableGrid().scrollTo("bottom")
            table.openIndexMenuForRow(lastRowIndex)
            table.deleteCase()
            numOfCases = (Number(numOfCases)-1).toString()
        })
        it("verify insert 1 case at the top", () => {
            table.getCaseTableGrid().scrollTo("top")
            table.openIndexMenuForRow(firstRowIndex)
            table.insertCase()
            table.getCaseTableGrid().scrollTo("top")
            cy.wait(500)
            table.openIndexMenuForRow(firstRowIndex)
            table.deleteCase()
            table.getNumOfCases().should("equal", numOfCases)
        })
        it("verify insert multiple cases below current case at the top", () => {
            table.getCaseTableGrid().scrollTo("top")
            table.openIndexMenuForRow(firstRowIndex)
            table.insertCases(3, "after")
            table.getCaseTableGrid().scrollTo("top")
            cy.wait(500)
            table.openIndexMenuForRow(firstRowIndex+1)
            table.deleteCase()
            table.openIndexMenuForRow(firstRowIndex+1)
            table.deleteCase()
            table.openIndexMenuForRow(firstRowIndex+1)
            table.deleteCase()
            table.getNumOfCases().should("equal", numOfCases)
        })
        it("verify insert multiple cases above current case at the top", () => {
            table.getCaseTableGrid().scrollTo("top")
            table.openIndexMenuForRow(firstRowIndex)
            table.insertCases(3, "before")
            table.getCaseTableGrid().scrollTo("top")
            cy.wait(500)
            table.openIndexMenuForRow(firstRowIndex)
            table.deleteCase()
            table.openIndexMenuForRow(firstRowIndex)
            table.deleteCase()
            table.openIndexMenuForRow(firstRowIndex)
            table.deleteCase()
            table.getNumOfCases().should("equal", numOfCases)
        })
        it("verify delete first case", () => {
            table.getCaseTableGrid().scrollTo("top")
            table.openIndexMenuForRow(firstRowIndex)
            table.deleteCase()
            numOfCases = (Number(numOfCases)-1).toString()
        })
        it("verify insert 1 case in the middle", () => {
            table.getCaseTableGrid().scrollTo("top")
            table.openIndexMenuForRow(middleRowIndex)
            table.insertCase()
            table.getCaseTableGrid().scrollTo("top")
            cy.wait(500)
            table.openIndexMenuForRow(middleRowIndex)
            table.deleteCase()
            table.getNumOfCases().should("equal", numOfCases)
        })
        it("verify insert multiple cases below current case in the middle", () => {
            table.getCaseTableGrid().scrollTo("top")
            table.openIndexMenuForRow(middleRowIndex)
            table.insertCases(3, "after")
            table.getCaseTableGrid().scrollTo("top")
            cy.wait(500)
            table.openIndexMenuForRow(middleRowIndex+1)
            table.deleteCase()
            table.openIndexMenuForRow(middleRowIndex+1)
            table.deleteCase()
            table.openIndexMenuForRow(middleRowIndex+1)
            table.deleteCase()
            table.getNumOfCases().should("equal", numOfCases)
        })
        it("verify insert multiple cases above current case in the middle", () => {
            table.getCaseTableGrid().scrollTo("top")
            table.openIndexMenuForRow(middleRowIndex)
            table.insertCases(3, "before")
            table.getCaseTableGrid().scrollTo("top")
            cy.wait(500)
            table.openIndexMenuForRow(middleRowIndex)
            table.deleteCase()
            table.openIndexMenuForRow(middleRowIndex)
            table.deleteCase()
            table.openIndexMenuForRow(middleRowIndex)
            table.deleteCase()
            table.getNumOfCases().should("equal", numOfCases)
        })
        it("verify delete case in the middle", () => {
            table.getCaseTableGrid().scrollTo("top")
            table.openIndexMenuForRow(middleRowIndex)
            table.deleteCase()
            numOfCases = (Number(numOfCases)-1).toString()
        })
    })
})
