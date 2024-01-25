import { TableTileElements as table } from "../support/elements/table-tile"
import { ComponentElements as c } from "../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"

const numOfAttributes = 10
const firstRowIndex = 2
let lastRowIndex = undefined
let middleRowIndex = undefined
let numOfCases = undefined
const collectionName = "Mammals"
const renamedCollectionName = "Animals"
const newCollectionName = "New Dataset"

beforeEach(() => {
  // cy.scrollTo() doesn't work as expected with `scroll-behavior: smooth`
  const queryParams = "?sample=mammals&dashboard&scrollBehavior=auto"
  const url = `${Cypress.config("index")}${queryParams}`
  cy.visit(url)
  cy.wait(2000)
  table.getNumOfAttributes().should("equal", numOfAttributes.toString())
  table.getNumOfRows().then($cases => {
    numOfCases = $cases
    lastRowIndex = Number($cases)
    middleRowIndex = Math.floor(lastRowIndex / 2)
  })
})

context("case table ui", () => {
  describe("table view", () => {
    it("populates title bar from sample data", () => {
      c.getComponentTitle("table").should("contain", collectionName)
    })
    it("verify columns and tooltips", () => {
      // css width specification caused grid virtualization to only have 9 attributes in the DOM
      table.getColumnHeaders().should("have.length.be.within", 9, 10)
      table.getColumnHeader(0).invoke("text").then(columnName => {
        // const columnNameArr = columnName.split()
        table.getColumnHeader(0).rightclick({ force: true })
        // table.getColumnHeaderTooltip().should("contain", columnNameArr[0])
      })
      table.getColumnHeader(1).invoke("text").then(columnName => {
        // const columnNameArr = columnName.split(" ")
        table.getColumnHeader(1).rightclick({ force: true })
        // table.getColumnHeaderTooltip().should("contain", columnNameArr[0])
      })
    })
    it("verify edit attribute properties", () => {
      const name = "Tallness",
        description = "The average height of the mammal.",
        unit = "meters",
        newName = "Tallness (meters)",
        type = null,
        precision = null,
        editable = "False"
      table.editAttributeProperty("Height", name, description, type, unit, precision, editable)
      table.getAttribute(name).should("have.text", newName)
      table.getAttribute(name).rightclick({ force: true })
      // table.getColumnHeaderTooltip().should("contain", `${name} : ${description}`)
    })
    // it("verify attribute reorder within a collection", () => {
    // })
    // it("verify index column cannot be reordered", () => {
    // })
  })

  describe("case table header attribute menu", () => {
    it("verify rename attribute", () => {
      table.getColumnHeader(1).should("contain", "Mammal")
      table.getAttribute("Mammal").should("exist")
      table.openAttributeMenu("Mammal")
      table.selectMenuItemFromAttributeMenu("Rename")
      table.renameColumnName(`Animal{enter}`)
      table.getColumnHeader(1).should("contain", "Animal")
      table.getAttribute("Animal").should("exist")
    })
    it("verify hide and showAll attribute", () => {
      table.openAttributeMenu("Mammal")
      table.selectMenuItemFromAttributeMenu("Hide Attribute")
      table.getColumnHeader(1).should("not.have.text", "Mammal")
      table.getAttribute("Mammal").should("not.exist")
      c.selectTile("table", 0)
      table.showAllAttributes()
      table.getColumnHeader(1).should("contain", "Mammal")
      table.getAttribute("Mammal").should("exist")
    })
    it("verify delete attribute", () => {
      table.openAttributeMenu("Mammal")
      table.selectMenuItemFromAttributeMenu("Delete Attribute")
      table.getColumnHeader(1).should("not.have.text", "Mammal")
      table.getAttribute("Mammal").should("not.exist")
      table.getColumnHeaders().should("have.length", numOfAttributes - 1)
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
      table.getNumOfRows().should("equal", numOfCases)
    })
    it("verify insert multiple cases below current case at the bottom", () => {
      table.getCaseTableGrid().scrollTo("bottom")
      table.openIndexMenuForRow(lastRowIndex)
      table.insertCases(2, "after")
      table.getCaseTableGrid().scrollTo("bottom")
      cy.wait(500)
      table.openIndexMenuForRow(lastRowIndex + 1)
      table.deleteCase()
      table.openIndexMenuForRow(lastRowIndex + 1)
      table.deleteCase()
      table.getNumOfRows().should("equal", numOfCases)
    })
    it("verify insert multiple cases above current case at the bottom", () => {
      table.getCaseTableGrid().scrollTo("bottom")
      table.openIndexMenuForRow(lastRowIndex)
      table.insertCases(2, "before")
      table.getCaseTableGrid().scrollTo("bottom")
      cy.wait(500)
      table.openIndexMenuForRow(lastRowIndex + 1)
      table.deleteCase()
      table.openIndexMenuForRow(lastRowIndex)
      table.deleteCase()
      table.getNumOfRows().should("equal", numOfCases)
    })
    it("verify delete last case", () => {
      table.getCaseTableGrid().scrollTo("bottom")
      table.openIndexMenuForRow(lastRowIndex)
      table.deleteCase()
      numOfCases = (Number(numOfCases) - 1).toString()
    })
    it("verify insert 1 case at the top", () => {
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(firstRowIndex)
      table.insertCase()
      table.getCaseTableGrid().scrollTo("top")
      cy.wait(500)
      table.openIndexMenuForRow(firstRowIndex)
      table.deleteCase()
      table.getNumOfRows().should("equal", numOfCases)
    })
    it("verify insert multiple cases below current case at the top", () => {
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(firstRowIndex)
      table.insertCases(3, "after")
      table.getCaseTableGrid().scrollTo("top")
      cy.wait(500)
      table.openIndexMenuForRow(firstRowIndex + 1)
      table.deleteCase()
      table.openIndexMenuForRow(firstRowIndex + 1)
      table.deleteCase()
      table.openIndexMenuForRow(firstRowIndex + 1)
      table.deleteCase()
      table.getNumOfRows().should("equal", numOfCases)
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
      table.getNumOfRows().should("equal", numOfCases)
    })
    it("verify delete first case", () => {
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(firstRowIndex)
      table.deleteCase()
      numOfCases = (Number(numOfCases) - 1).toString()
    })
    it("verify insert 1 case in the middle", () => {
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(middleRowIndex)
      table.insertCase()
      table.getCaseTableGrid().scrollTo("top")
      cy.wait(500)
      table.openIndexMenuForRow(middleRowIndex)
      table.deleteCase()
      table.getNumOfRows().should("equal", numOfCases)
    })
    it("verify insert multiple cases below current case in the middle", () => {
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(middleRowIndex)
      table.insertCases(3, "after")
      table.getCaseTableGrid().scrollTo("top")
      cy.wait(500)
      table.openIndexMenuForRow(middleRowIndex + 1)
      table.deleteCase()
      table.openIndexMenuForRow(middleRowIndex + 1)
      table.deleteCase()
      table.openIndexMenuForRow(middleRowIndex + 1)
      table.deleteCase()
      table.getNumOfRows().should("equal", numOfCases)
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
      table.getNumOfRows().should("equal", numOfCases)
    })
    it("verify delete case in the middle", () => {
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(middleRowIndex)
      table.deleteCase()
      numOfCases = (Number(numOfCases) - 1).toString()
    })
  })

  describe("table component", () => {
    it("updates table title", () => {
      c.getComponentTitle("table").should("have.text", collectionName)
      c.changeComponentTitle("table", renamedCollectionName)
      c.getComponentTitle("table").should("have.text", renamedCollectionName)
    })
    it("creates tables with new collection name", () => {
      table.createNewTableFromToolshelf()

      c.getComponentTitle("table").should("contain", collectionName)
      c.getComponentTitle("table", 1).should("contain", newCollectionName)

      table.createNewTableFromToolshelf()
      c.getComponentTitle("table", 2).should("contain", newCollectionName)
    })
    it("creates tables with new collection names when existing ones are closed", () => {
      c.closeComponent("table")
      c.checkComponentDoesNotExist("table")
      table.createNewTableFromToolshelf()
      c.getComponentTitle("table").should("contain", newCollectionName)

      c.closeComponent("table")
      c.checkComponentDoesNotExist("table")
      table.createNewTableFromToolshelf()
      c.getComponentTitle("table").should("contain", newCollectionName)
    })
    it("closes and reopens existing case tables", () => {
      c.closeComponent("table")
      c.checkComponentDoesNotExist("table")
      table.openExistingTableFromToolshelf(collectionName)
      c.getComponentTitle("table").should("contain", collectionName)
    })
    it("checks all table tooltips", () => {
      c.selectTile("table", 0)
      toolbar.getToolShelfIcon("table").then($element => {
        c.checkToolTip($element, c.tooltips.tableToolShelfIcon)
      })
      c.getMinimizeButton("table").then($element => {
        c.checkToolTip($element, c.tooltips.minimizeComponent)
      })
      c.getCloseButton("table").then($element => {
        c.checkToolTip($element, c.tooltips.closeComponent)
      })
      table.getToggleCardView().then($element => {
        c.checkToolTip($element, c.tooltips.tableSwitchCaseCard)
      })
      table.getDatasetInfoButton().then($element => {
        c.checkToolTip($element, c.tooltips.tableDatasetInfoButton)
      })
      table.getResizeButton().then($element => {
        c.checkToolTip($element, c.tooltips.tableResizeButton)
      })
      table.getDeleteCasesButton().then($element => {
        c.checkToolTip($element, c.tooltips.tableDeleteCasesButton)
      })
      table.getHideShowButton().then($element => {
        c.checkToolTip($element, c.tooltips.tableHideShowButton)
      })
      table.getAttributesButton().then($element => {
        c.checkToolTip($element, c.tooltips.tableAttributesButton)
      })
    })
  })
})
