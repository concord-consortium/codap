import { TableTileElements as table } from "../support/elements/table-tile"
import { ComponentElements as c } from "../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { FormulaHelper as fh } from "../support/helpers/formula-helper"

context("case table ui", () => {
  const numOfAttributes = 10
  const firstRowIndex = 2
  let lastRowIndex = -1
  let middleRowIndex = -1
  let numOfCases = "0"
  const collectionName = "Mammals"
  const renamedCollectionName = "Animals"
  const newCollectionName = "New Dataset"

  beforeEach(() => {
    // cy.scrollTo() doesn't work as expected with `scroll-behavior: smooth`
    const queryParams = "?sample=mammals&scrollBehavior=auto"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(1000)
    table.getNumOfAttributes().should("equal", numOfAttributes.toString())
    table.getNumOfRows().then($cases => {
      numOfCases = $cases ?? "0"
      lastRowIndex = Number($cases) - 1
      middleRowIndex = Math.min(5, Math.floor(lastRowIndex / 2))
    })
  })

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
    it("verify edit attribute properties with undo and redo", () => {
      const name = "Tallness",
        description = "The average height of the mammal.",
        unit = "meters",
        newName = "Tallness(meters)", // this would appear over 2 lines and extra spaces are trimmed
        type = "color",
        precision = null,
        editable = "No"

      // Edit the attribute property
      table.editAttributeProperties("Height", name, description, type, unit, precision, editable)
      // Verify the attribute has been edited
      table.getAttribute(name).should("have.text", newName)


      // opening the dialog again should show the updated values
      table.openAttributeMenu(name)
      table.selectMenuItemFromAttributeMenu("Edit Attribute Properties...")
      cy.get("[data-testid='attr-name-input']").should("have.value", name)
      cy.get("[data-testid='attr-description-input']").should("have.text", description)
      cy.get("[data-testid='attr-type-select']").should("have.value", type)
      cy.get("[data-testid='attr-editable-radio'] input[value='no']").should("be.checked")
      table.getCancelButton().click({force: true})

      cy.log("check undo/redo after verify attribute properties")
      // Perform Undo operation
      toolbar.getUndoTool().click()

      // Verify the undo reverts the edit to the original name "Height"
      table.getAttribute("Height").should("have.text", "Height")

      // opening the dialog again should show the original values
      table.openAttributeMenu("Height")
      table.selectMenuItemFromAttributeMenu("Edit Attribute Properties...")
      cy.get("[data-testid='attr-name-input']").should("have.value", "Height")
      cy.get("[data-testid='attr-description-input']").should("have.text", "")
      cy.get("[data-testid='attr-type-select']").should("have.value", "none")
      cy.get("[data-testid='attr-editable-radio'] input[value='yes']").should("be.checked")
      table.getCancelButton().click()

      // Perform Redo operation
      toolbar.getRedoTool().click()

      // Verify the redo reapplies the edit
      table.getAttribute(name).should("have.text", newName)

      // table.getColumnHeaderTooltip().should("contain", `${name} : ${description}`)
    })
    // it("verify attribute reorder within a collection", () => {
    // })
    // it("verify index column cannot be reordered", () => {
    // })
  })
  // TODO: add tests for: Rerandomize All, Export Case Data, Copy to Clipboard,
  // Import Case Data from Clipboard (PT: #184432150)
  describe("case table Inspector menu options", () => {
    it("should open dataset information button and make changes", () => {
      const newInfoName = "Animals",
        newSource = "The Internet",
        importDate = "May 4",
        newDescription = "All about mammals"

      // Enter new dataset information
      c.selectTile("table", 0)
      table.editDatasetInformation(newInfoName, newSource, importDate, newDescription)
      table.getDatasetInfoButton().click()

      // Checks that the new description information is filled in
      cy.get("[data-testid='dataset-name-input']").should("have.value", newInfoName)
      cy.get("[data-testid='dataset-source-input']").should("have.value", newSource)
      cy.get("[data-testid='dataset-date-input']").should("have.value", importDate)
      cy.get("[data-testid=dataset-description-input]").should("have.value", newDescription)
    })
    it("select a case and delete the case from inspector menu", () => {
      let initialRowCount = 0
      let postDeleteRowCount: number | undefined

      // Get initial row count
      table.getNumOfRows().then(rowCount => {
        initialRowCount = Number(rowCount)
      })

      table.getGridCell(2, 2).should("contain", "African Elephant").click({ force: true })
      table.getSelectedRows().should("have.length", 1)
      table.getCollectionSpacer().click()
      table.getCollectionSpacer().click()
      table.getSelectedRows().should("have.length", 0)

      table.getGridCell(2, 2).should("contain", "African Elephant").click({ force: true })
      table.getSelectedRows().should("have.length", 1)
      table.getDeleteCasesButton().click({force: true})
      table.getDeleteMenuItem("Delete Selected Cases").click({force: true})

      // Row count after delete one case
      table.getNumOfRows().then(rowCount => {
        postDeleteRowCount = Number(rowCount)
        expect(postDeleteRowCount).to.eq(initialRowCount - 1)
      })

      // checks for undo/redo
      cy.log("check for undo/redo after delete")

      // Undo delete
      toolbar.getUndoTool().click()

      // Verify undo (check if row count is back to post-insert count)
      // TODO: add the check once bug is fixed (PT ##187597588)
      table.getNumOfRows().then(rowCount => {
       const rowCountAfterUndo = Number(rowCount)
       expect(rowCountAfterUndo).to.eq(initialRowCount)
      })

      // Redo delete
      toolbar.getRedoTool().click()

      // Verify redo (check if row count is back to initial count)
      // TODO: add the check once bug is fixed (PT ##187597588)
       table.getNumOfRows().then(rowCount => {
       const rowCountAfterRedo = Number(rowCount)
       expect(rowCountAfterRedo).to.eq(postDeleteRowCount)
      })
    })
    it("select a case and delete unselected cases from inspector menu", () => {
      let initialRowCount: number | undefined
      let postDeleteRowCount: number | undefined

      // Get initial row count
      table.getNumOfRows().then(rowCount => {
        initialRowCount = Number(rowCount)
      })

      // Delete one case in table
      //c.selectTile("table", 0)
      table.getGridCell(2, 2).should("contain", "African Elephant").click({ force: true })
      table.getDeleteCasesButton().click()
      table.getDeleteMenuItem("Delete Unselected Cases").click()

      // Row count after delete all cases (assuming row count is set to 1 if no cases are in the table)
      table.getNumOfRows().then(rowCount => {
        postDeleteRowCount = Number(rowCount)
        expect(postDeleteRowCount).to.eq(3)
        expect(initialRowCount).to.be.greaterThan(postDeleteRowCount) // add a check to make sure rows were deleted
      })

      // checks for undo/redo
      cy.log("check for undo/redo after delete")

      // Undo delete
      toolbar.getUndoTool().click()

      // Verify undo (check if row count is back to post-insert count)
      // TODO: add the check once bug is fixed (PT ##187597588)
      table.getNumOfRows().then(rowCount => {
       const rowCountAfterUndo = Number(rowCount)
       expect(rowCountAfterUndo).to.eq(initialRowCount)
      })

      // Redo delete
      toolbar.getRedoTool().click()

      // Verify redo (check if row count is back to initial count)
      // TODO: add the check once bug is fixed (PT ##187597588)
       table.getNumOfRows().then(rowCount => {
       const rowCountAfterRedo = Number(rowCount)
       expect(rowCountAfterRedo).to.eq(postDeleteRowCount)
      })
    })
    it("check delete all cases from inspector menu", () => {
      let initialRowCount: number | undefined
      let postInsertRowCount: number | undefined

      // Get initial row count
      table.getNumOfRows().then(rowCount => {
        initialRowCount = Number(rowCount)
      })

      // Delete all cases in table
      c.selectTile("table", 0)
      table.getDeleteCasesButton().click()
      table.getDeleteMenuItem("Delete All Cases").click()

      // Row count after delete all cases (assuming row count is set to 1 if no cases are in the table)
      table.getNumOfRows().then(rowCount => {
        postInsertRowCount = Number(rowCount)
        expect(postInsertRowCount).to.eq(2)
        expect(initialRowCount).to.be.greaterThan(postInsertRowCount) // add a check to make sure rows were deleted
      })
    })
    it("check hide/show attribute from inspector menu", () => {
      // Hide the attribute
      table.openAttributeMenu("Mammal")
      table.selectMenuItemFromAttributeMenu("Hide Attribute")

      // Verify attribute is hidden
      table.getColumnHeader(1).should("not.have.text", "Mammal")
      table.getAttribute("Mammal").should("not.exist")

      // Show all attributes
      c.selectTile("table", 0)
      table.getHideShowButton().click()
      table.getHideShowMenuItem("Show 1 Hidden Attribute").click()

      // Verify all attributes are shown
      table.getColumnHeader(1).should("contain", "Mammal")
      table.getAttribute("Mammal").should("exist")
    })

    it("tests for set aside cases with undo/redo", () => {
      let initialRowCount = 0

      // Get initial row count
      table.getNumOfRows().then(rowCount => {
        initialRowCount = Number(rowCount)
      })

      table.getGridCell(2, 2).should("contain", "African Elephant").click({ force: true })
      table.getHideShowButton().click()
      table.getHideShowMenuItem("Set Aside Selected Cases").click()

      // Row count after delete all cases (assuming row count is set to 1 if no cases are in the table)
      table.getNumOfRows().then(rowCount => {
        const postSetAsideRowCount = Number(rowCount)
        expect(postSetAsideRowCount).to.eq(initialRowCount - 1)
      })

      // Undo set aside
      toolbar.getUndoTool().click()

      table.getNumOfRows().then(rowCount => {
        const rowCountAfterUndo = Number(rowCount)
        expect(rowCountAfterUndo).to.eq(initialRowCount)
      })

      // Redo set aside
      toolbar.getRedoTool().click()

      table.getNumOfRows().then(rowCount => {
        const rowCountAfterRedo = Number(rowCount)
        expect(rowCountAfterRedo).to.eq(initialRowCount - 1)
      })

      table.getGridCell(2, 2).should("contain", "Asian Elephant").click({ force: true })
      table.getHideShowButton().click()
      table.getHideShowMenuItem("Set Aside Unselected Cases").click()

      table.getNumOfRows().then(rowCount => {
        const rowCountAfterSetAsideUnselected = Number(rowCount)
        expect(rowCountAfterSetAsideUnselected).to.eq(3)
      })

      // Undo set aside
      toolbar.getUndoTool().click()

      table.getNumOfRows().then(rowCount => {
        const rowCountAfterUndo = Number(rowCount)
        expect(rowCountAfterUndo).to.eq(initialRowCount - 1)
      })

      // Redo set aside
      toolbar.getRedoTool().click()

      table.getNumOfRows().then(rowCount => {
        const rowCountAfterRedo = Number(rowCount)
        expect(rowCountAfterRedo).to.eq(3)
      })

      // Show all set aside cases
      table.getHideShowButton().click()
      table.getHideShowMenuItem(/Restore \d+ Set Aside Cases/).click()

      table.getNumOfRows().then(rowCount => {
        const rowCountAfterShowAll = Number(rowCount)
        expect(rowCountAfterShowAll).to.eq(initialRowCount)
      })

      // Undo show all set aside cases
      toolbar.getUndoTool().click()

      table.getNumOfRows().then(rowCount => {
        const rowCountAfterUndo = Number(rowCount)
        expect(rowCountAfterUndo).to.eq(3)
      })

      // Redo set aside
      toolbar.getRedoTool().click()

      table.getNumOfRows().then(rowCount => {
        const rowCountAfterRedo = Number(rowCount)
        expect(rowCountAfterRedo).to.eq(initialRowCount)
      })
    })

    it("check New Attribute from inspector menu with undo/redo", () => {
      c.selectTile("table", 0)
      table.getRulerButton().click()
      table.getRulerMenuItem("New Attribute in Cases...").click()

      // verify new attribute exists
      table.getColumnHeaders().should("have.length.be.within", 10, 11)
      table.getAttributeInput().last().should("exist").and("have.value", "newAttr").type("{enter}")
      table.getAttribute("newAttr").should("have.text", "newAttr")

      cy.log("check undo/redo after add new attribute")
      // Perform Undo operation
      toolbar.getUndoTool().click()

      // Test if attribute is removed
      table.getColumnHeaders().should("have.length.be.within", 9, 10)
      table.getAttribute("newAttr").should("not.exist")

      // Perform Redo operation
      toolbar.getRedoTool().click()

      // verify new attribute exists
      table.getColumnHeaders().should("have.length.be.within", 10, 11)
      table.getAttribute("newAttr").should("exist")
      table.getAttribute("newAttr").click()
      table.getAttribute("newAttr").should("have.text", "newAttr")
    })
  })
  describe("case table header attribute menu", () => {
    it("verify add attribute with undo and redo", ()=>{
      // Add new attribute using Add New Attribute button (+)
      fh.addNewAttribute()

      // verify new attribute exists
      table.getColumnHeaders().should("have.length.be.within", 10, 11)
      table.getAttribute("newAttr").should("exist")
      table.getAttribute("newAttr").click()
      table.getAttribute("newAttr").should("have.text", "newAttr")

      cy.log("check undo/redo after add new attribute")
      // Perform Undo operation
      toolbar.getUndoTool().click()

      // Test if attribute is removed
      table.getColumnHeaders().should("have.length.be.within", 9, 10)
      table.getAttribute("newAttr").should("not.exist")

      // Perform Redo operation
      toolbar.getRedoTool().click()

      // verify new attribute exists
      table.getColumnHeaders().should("have.length.be.within", 10, 11)
      table.getAttribute("newAttr").should("exist")
      table.getAttribute("newAttr").click()
      table.getAttribute("newAttr").should("have.text", "newAttr")
    })
    it("verify rename attribute with undo and redo", () => {

      // Verify initial state
      table.getColumnHeader(1).should("contain", "Mammal")
      table.getAttribute("Mammal").should("exist")

      // Rename the attribute
      table.openAttributeMenu("Mammal")
      table.selectMenuItemFromAttributeMenu("Rename")
      table.renameColumnName(`Animal{enter}`)

      // Verify rename
      table.getColumnHeader(1).should("contain", "Animal")
      table.getAttribute("Animal").should("exist")

      cy.log("check undo/redo after rename attribute")
      // Undo rename
      toolbar.getUndoTool().click()

      // Verify undo (revert to original name)
      table.getColumnHeader(1).should("contain", "Mammal")
      table.getAttribute("Mammal").should("exist")

      // Redo rename
      toolbar.getRedoTool().click()

      // Verify redo (name changed back to new name)
      table.getColumnHeader(1).should("contain", "Animal")
      table.getAttribute("Animal").should("exist")
    })
    it("edits, re-randomizes, and deletes formulas", () => {
      // add a random() formula
      table.addFormula("Height", "random()")
      let random1 = 0
      table.getGridCell(2, 5).then(cell => {
        random1 = +cell.text()
        expect(random1 >= 0).to.eq(true)
        expect(random1 < 1).to.eq(true)
      })
      // Rerandomize
      let random2 = 0
      table.openAttributeMenu("Height")
      table.selectMenuItemFromAttributeMenu("Rerandomize")
      table.getGridCell(2, 5).then(cell => {
        random2 = +cell.text()
        expect(random2 >= 0).to.eq(true)
        expect(random2 < 1).to.eq(true)
        expect(random2).not.to.eq(random1)
      })
      // Delete formula, verify values remain
      table.openAttributeMenu("Height")
      table.selectMenuItemFromAttributeMenu("Delete Formula (Keeping Values)")
      table.getGridCell(2, 5).then(cell => {
        const value = +cell.text()
        expect(value >= 0).to.eq(true)
        expect(value < 1).to.eq(true)
        expect(value).to.eq(random2)
      })
      // verify that formula was deleted
      table.openAttributeMenu("Height")
      table.getAttributeMenuItem("Rerandomize").should("be.disabled")
      table.getAttributeMenuItem("Delete Formula (Keeping Values)").should("be.disabled")
      // Undo formula deletion
      toolbar.getUndoTool().click()
      table.openAttributeMenu("Height")
      table.getAttributeMenuItem("Rerandomize").should("be.enabled")
      table.getAttributeMenuItem("Delete Formula (Keeping Values)").should("be.enabled")
      table.getGridCell(2, 5).then(cell => {
        const value = +cell.text()
        expect(value >= 0).to.eq(true)
        expect(value < 1).to.eq(true)
        // restored formula is re-evaluated resulting in a different value
        expect(value).not.to.eq(random2)
      })
    })
    it("verify hide and showAll attribute with undo and redo", () => {

      // Hide the attribute
      table.openAttributeMenu("Mammal")
      table.selectMenuItemFromAttributeMenu("Hide Attribute")

      // Verify attribute is hidden
      table.getColumnHeader(1).should("not.have.text", "Mammal")
      table.getAttribute("Mammal").should("not.exist")

      cy.log("check undo/redo after hide and showAll attribute")
      // Undo hide
      toolbar.getUndoTool().click()

      // Verify undo (attribute should be visible again)
      table.getColumnHeader(1).should("contain", "Mammal")
      table.getAttribute("Mammal").should("exist")

      // Redo hide
      toolbar.getRedoTool().click()

      // Verify redo (attribute should be hidden again)
      table.getColumnHeader(1).should("not.have.text", "Mammal")
      table.getAttribute("Mammal").should("not.exist")

      // Show all attributes
      c.selectTile("table", 0)
      table.showAllAttributes()

      // Verify all attributes are shown
      table.getColumnHeader(1).should("contain", "Mammal")
      table.getAttribute("Mammal").should("exist")
    })
    it("verify delete attribute with undo and redo", () => {
      // Capture the initial number of attributes
      // note: it looks like getNumOfAttributes does this already
      // let numOfAttributes
      // table.getColumnHeaders().then(headers => {
      // numOfAttributes = headers.length
      // })

      // Delete the attribute
      table.openAttributeMenu("Mammal")
      table.selectMenuItemFromAttributeMenu("Delete Attribute")

      // Verify attribute is deleted
      table.getColumnHeader(1).should("not.have.text", "Mammal")
      table.getAttribute("Mammal").should("not.exist")
      table.getColumnHeaders().should("have.length", numOfAttributes - 1)

      cy.log("check undo/redo after delete attribute")
      // Undo delete
      toolbar.getUndoTool().click()

      // Verify undo (attribute should be restored)
      table.getColumnHeader(1).should("contain", "Mammal")
      table.getAttribute("Mammal").should("exist")
      table.getColumnHeaders().should("have.length", numOfAttributes)

      // Redo delete
      toolbar.getRedoTool().click()

      // Verify redo (attribute should be deleted again)
      table.getColumnHeader(1).should("not.have.text", "Mammal")
      table.getAttribute("Mammal").should("not.exist")
      table.getColumnHeaders().should("have.length", numOfAttributes - 1)
    })
  })

  describe("index menu", () => {
    it("verify index menu insert case and delete case work", () => {

      let initialRowCount = 0, postInsertRowCount = -1, postDeleteRowCount = -1

      // Get initial row count
      table.getNumOfRows().then(rowCount => {
        initialRowCount = Number(rowCount)
      })

      // Insert a new case
      table.openIndexMenuForRow(2)
      table.insertCase()

      // Get row count after insert
      table.getNumOfRows().then(rowCount => {
        postInsertRowCount = Number(rowCount)
        expect(postInsertRowCount).to.eq(initialRowCount + 1)
      })

      // Delete the inserted case
      table.openIndexMenuForRow(2)
      table.deleteCase()

      // Get row count after delete
      table.getNumOfRows().then(rowCount => {
        postDeleteRowCount = Number(rowCount)
        expect(postDeleteRowCount).to.eq(initialRowCount)
      })

      cy.log("check undo/redo after insert case and delete case work")
      // Undo delete
      toolbar.getUndoTool().click()

      // Verify undo (check if row count is back to post-insert count)
      table.getNumOfRows().then(rowCount => {
        const rowCountAfterUndo = Number(rowCount)
        expect(rowCountAfterUndo).to.eq(postInsertRowCount)
      })

      // Redo delete
      toolbar.getRedoTool().click()

      // Verify redo (check if row count is back to initial count)
      table.getNumOfRows().then(rowCount => {
        const rowCountAfterRedo = Number(rowCount)
        expect(rowCountAfterRedo).to.eq(initialRowCount)
      })
    })
    it("verify insert cases before a row by typing num of cases", () => {

      // Initial steps to insert cases before a specific row
      table.openIndexMenuForRow(2)
      table.insertCases(2, "before")

      // Delete the newly inserted cases
      table.openIndexMenuForRow(2)
      table.deleteCase() // Delete the first inserted case
      table.openIndexMenuForRow(2)
      table.deleteCase() // Delete the second inserted case

      // Use the toolbar to undo the last action (which should be the deletion of the second case)
      cy.log("check for undo/redo after delete cases")
      toolbar.getUndoTool().click()

      // TODO: Add assertions here to verify the case is restored (PT ##187127871)
      // For example, check the number of rows or a specific row's content

      // Use the toolbar to redo the last undone action (which should redo the deletion of the case)
      toolbar.getRedoTool().click()
      // Add assertions here to verify the case is deleted again
      // For example, check the number of rows or a specific row's content
    })
    it("verify insert cases after a row by typing num of cases", () => {
      table.openIndexMenuForRow(2)
      table.insertCases(2, "after")
      table.openIndexMenuForRow(3)
      table.deleteCase()
      table.openIndexMenuForRow(3)
      table.deleteCase()

      // Use the toolbar to undo the last action
      cy.log("check for undo/redo after deletion of the second case")
      toolbar.getUndoTool().click()

      // TODO: Add assertions here to verify the case is restored (PT ##187127871)
      // For example, check the number of rows or a specific row's content

      // Use the toolbar to redo the last undone action (which should redo the deletion of the case)
      toolbar.getRedoTool().click()
      // Add assertions here to verify the case is deleted again
      // For example, check the number of rows or a specific row's content
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
      table.openIndexMenuForRow(lastRowIndex)
      table.deleteCase()
      table.getNumOfRows().should("equal", numOfCases)

      // toolbar.getUndoTool().click()

      // TODO: Add assertions here to verify the case is restored (PT ##187127871)
      // For example, check the number of rows or a specific row's content

      // Use the toolbar to redo the last undone action (which should redo the deletion of the case)
      // toolbar.getRedoTool().click()
      // Add assertions here to verify the case is deleted again
      // For example, check the number of rows or a specific row's content
    })
    it("verify insert 1 case at the bottom using input row", () => {
      table.getCaseTableGrid().scrollTo("bottom")
      table.getNumOfRows().should("equal", numOfCases)
      table.getGridCell(lastRowIndex + 1, 2).dblclick()
      table.getGridCell(lastRowIndex + 1, 2).find("input").type("Sloth{enter}")
      table.getNumOfRows().should("equal", `${Number(numOfCases) + 1}`)
    })
    it("verify insert multiple cases below current case at the bottom", () => {
      table.getCaseTableGrid().scrollTo("bottom")
      table.openIndexMenuForRow(lastRowIndex)
      table.insertCases(2, "after")
      table.getCaseTableGrid().scrollTo("bottom")
      table.openIndexMenuForRow(lastRowIndex + 1)
      table.deleteCase()
      table.openIndexMenuForRow(lastRowIndex + 1)
      table.deleteCase()
      table.getNumOfRows().should("equal", numOfCases)

      // Use the toolbar to undo the last action
      cy.log("check for undo/redo after deletion of bottom case")
      toolbar.getUndoTool().click()

      // TODO: Add assertions here to verify the case is restored (PT ##187127871)
      // For example, check the number of rows or a specific row's content

      // Use the toolbar to redo the last undone action (which should redo the deletion of the case)
      toolbar.getRedoTool().click()
      // Add assertions here to verify the case is deleted again
      // For example, check the number of rows or a specific row's content
    })
    it("verify insert multiple cases above current case at the bottom", () => {
      table.getCaseTableGrid().scrollTo("bottom")
      table.openIndexMenuForRow(lastRowIndex)
      table.insertCases(2, "before")
      table.getCaseTableGrid().scrollTo("bottom")
      table.openIndexMenuForRow(lastRowIndex + 1)
      table.deleteCase()
      table.openIndexMenuForRow(lastRowIndex)
      table.deleteCase()
      table.getNumOfRows().should("equal", numOfCases)

      // Use the toolbar to undo the last action
      cy.log("check for undo/redo after deletion of last case")
      toolbar.getUndoTool().click()

      // TODO: Add assertions here to verify the case is restored (PT ##187127871)
      // For example, check the number of rows or a specific row's content

      // Use the toolbar to redo the last undone action (which should redo the deletion of the case)
      toolbar.getRedoTool().click()
      // Add assertions here to verify the case is deleted again
      // For example, check the number of rows or a specific row's content
    })
    it("verify delete last case", () => {
      table.getCaseTableGrid().scrollTo("bottom")
      table.openIndexMenuForRow(lastRowIndex)
      table.deleteCase()
      numOfCases = `${Number(numOfCases) - 1}`

      // TODO: Add assertions here to verify the case is restored (PT ##187127871)
      // For example, check the number of rows or a specific row's content

      // Use the toolbar to redo the last undone action (which should redo the deletion of the case)
      // toolbar.getRedoTool().click()
      // Add assertions here to verify the case is deleted again
      // For example, check the number of rows or a specific row's content
    })
    it("verify insert 1 case at the top", () => {
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(firstRowIndex)
      table.insertCase()
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(firstRowIndex)
      table.deleteCase()
      table.getNumOfRows().should("equal", numOfCases)

      // Use the toolbar to undo the last action
      cy.log("check for undo/redo after deletion of top case")
      toolbar.getUndoTool().click()

      // TODO: Add assertions here to verify the case is restored (PT ##187127871)
      // For example, check the number of rows or a specific row's content

      // Use the toolbar to redo the last undone action (which should redo the deletion of the case)
      toolbar.getRedoTool().click()
      // Add assertions here to verify the case is deleted again
      // For example, check the number of rows or a specific row's content
    })
    it("verify insert multiple cases below current case at the top", () => {
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(firstRowIndex)
      table.insertCases(3, "after")
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(firstRowIndex + 1)
      table.deleteCase()
      table.openIndexMenuForRow(firstRowIndex + 1)
      table.deleteCase()
      table.openIndexMenuForRow(firstRowIndex + 1)
      table.deleteCase()
      table.getNumOfRows().should("equal", numOfCases)

      // Use the toolbar to undo the last action
      cy.log("check for undo/redo after deletion of top case above")
      toolbar.getUndoTool().click()

      // TODO: Add assertions here to verify the case is restored (PT ##187127871)
      // For example, check the number of rows or a specific row's content

      // Use the toolbar to redo the last undone action (which should redo the deletion of the case)
      toolbar.getRedoTool().click()
      // Add assertions here to verify the case is deleted again
      // For example, check the number of rows or a specific row's content
    })
    it("verify insert multiple cases above current case at the top", () => {
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(firstRowIndex)
      table.insertCases(3, "before")
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(firstRowIndex)
      table.deleteCase()
      table.openIndexMenuForRow(firstRowIndex)
      table.deleteCase()
      table.openIndexMenuForRow(firstRowIndex)
      table.deleteCase()
      table.getNumOfRows().should("equal", numOfCases)

      // Use the toolbar to undo the last action
      cy.log("check for undo/redo after deletion of multiple cases on top")
      toolbar.getUndoTool().click()

      // TODO: Add assertions here to verify the case is restored (PT ##187127871)
      // For example, check the number of rows or a specific row's content

      // Use the toolbar to redo the last undone action (which should redo the deletion of the case)
      toolbar.getRedoTool().click()
      // Add assertions here to verify the case is deleted again
      // For example, check the number of rows or a specific row's content
    })
    it("verify delete first case", () => {
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(firstRowIndex)
      table.deleteCase()
      numOfCases = `${Number(numOfCases) - 1}`

      // Use the toolbar to undo the last action
      cy.log("check for undo/redo after deletion of first case")
      toolbar.getUndoTool().click()

      // TODO: Add assertions here to verify the case is restored (PT ##187127871)
      // For example, check the number of rows or a specific row's content

      // Use the toolbar to redo the last undone action (which should redo the deletion of the case)
      toolbar.getRedoTool().click()
      // Add assertions here to verify the case is deleted again
      // For example, check the number of rows or a specific row's content
    })
    it("verify insert 1 case in the middle", () => {
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(middleRowIndex)
      table.insertCase()
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(middleRowIndex)
      table.deleteCase()
      table.getNumOfRows().should("equal", numOfCases)

      // Use the toolbar to undo the last action
      cy.log("check for undo/redo after deletion of insertion of middle case")
      toolbar.getUndoTool().click()

      // TODO: Add assertions here to verify the case is restored (PT ##187127871)
      // For example, check the number of rows or a specific row's content

      // Use the toolbar to redo the last undone action (which should redo the deletion of the case)
      toolbar.getRedoTool().click()
      // Add assertions here to verify the case is deleted again
      // For example, check the number of rows or a specific row's content
    })
    it("verify insert multiple cases below current case in the middle", () => {
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(middleRowIndex)
      table.insertCases(3, "after")
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(middleRowIndex + 1)
      table.deleteCase()
      table.openIndexMenuForRow(middleRowIndex + 1)
      table.deleteCase()
      table.openIndexMenuForRow(middleRowIndex + 1)
      table.deleteCase()
      table.getNumOfRows().should("equal", numOfCases)

      // Use the toolbar to undo the last action
      cy.log("check for undo/redo after deletion below the middle case")
      toolbar.getUndoTool().click()

      // TODO: Add assertions here to verify the case is restored (PT ##187127871)
      // For example, check the number of rows or a specific row's content

      // Use the toolbar to redo the last undone action (which should redo the deletion of the case)
      toolbar.getRedoTool().click()
      // Add assertions here to verify the case is deleted again
      // For example, check the number of rows or a specific row's content
    })
    it("verify insert multiple cases above current case in the middle", () => {
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(middleRowIndex)
      table.insertCases(3, "before")
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(middleRowIndex)
      table.deleteCase()
      table.openIndexMenuForRow(middleRowIndex)
      table.deleteCase()
      table.openIndexMenuForRow(middleRowIndex)
      table.deleteCase()
      table.getNumOfRows().should("equal", numOfCases)

      // Use the toolbar to undo the last action
      cy.log("check for undo/redo after deletion above the middle case above current case")
      toolbar.getUndoTool().click()

      // TODO: Add assertions here to verify the case is restored (PT ##187127871)
      // For example, check the number of rows or a specific row's content

      // Use the toolbar to redo the last undone action
      toolbar.getRedoTool().click()
      // Add assertions here to verify the case is deleted again
      // For example, check the number of rows or a specific row's content
    })
    it("verify delete case in the middle", () => {
      table.getCaseTableGrid().scrollTo("top")
      table.openIndexMenuForRow(middleRowIndex)
      table.deleteCase()
      numOfCases = `${Number(numOfCases) - 1}`

      // Use the toolbar to undo the last action
      cy.log("check for undo/redo after deletion of case in the middle row")
      toolbar.getUndoTool().click()

      // TODO: Add assertions here to verify the case is restored (PT ##187127871)
      // For example, check the number of rows or a specific row's content

      // Use the toolbar to redo the last undone action (which should redo the deletion of the case)
      toolbar.getRedoTool().click()

      // Add assertions here to verify the case is deleted again
      // For example, check the number of rows or a specific row's content
    })
  })

  describe("table component", () => {
    it("updates table title", () => {
      c.getComponentTitle("table").should("have.text", collectionName)
      c.changeComponentTitle("table", renamedCollectionName)
      c.getComponentTitle("table").should("have.text", renamedCollectionName)

      // TODO: add a check for undo/redo rename Collection name
      // See PT #187033159
    })
    it("creates tables with new collection name", () => {
      table.createNewTableFromToolShelf()

      c.getComponentTitle("table").should("contain", collectionName)
      c.getComponentTitle("table", 1).should("contain", newCollectionName)

      table.createNewTableFromToolShelf()
      c.getComponentTitle("table", 2).should("contain", newCollectionName)
    })
    it("creates tables with new collection names when existing ones are closed", () => {
      c.closeComponent("table")
      c.checkComponentDoesNotExist("table")
      table.createNewTableFromToolShelf()
      c.getComponentTitle("table").should("contain", newCollectionName)

      c.closeComponent("table")
      c.checkComponentDoesNotExist("table")
      table.createNewTableFromToolShelf()
      c.getComponentTitle("table").should("contain", newCollectionName)
    })
    it("closes and reopens existing case tables with undo and redo", () => {
      c.closeComponent("table")
      c.checkComponentDoesNotExist("table")

      // Add undo for closing table component
      cy.log("check for undo/redo after closing table")
      toolbar.getUndoTool().click()

      // Asserts table has been reopened
      c.getComponentTitle("table").should("contain", "Mammals")

      // Add redo for closing table
      toolbar.getRedoTool().click()

      // Asserts table is closed again
      c.checkComponentDoesNotExist("table")

      table.openExistingTableFromToolShelf(collectionName)
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
      table.getRulerButton().then($element => {
        c.checkToolTip($element, c.tooltips.tableRulerButton)
      })
    })
  })

  describe("table cell editing", () => {
    it("edits cells with color swatch", () => {
      cy.log("checking cell contents")
      table.getGridCell(2, 2).should("contain", "African Elephant")

      cy.log("double-clicking the cell")
      // double-click to initiate editing cell
      table.getGridCell(2, 2).dblclick()
      cy.wait(100) // Wait for the editing input to appear

      cy.log("check the editing cell contents")
      table.getGridCell(2, 2).find("[data-testid='cell-text-editor']").should("have.value", "African Elephant")
      // type a color string
      table.getGridCell(2, 2).find("[data-testid='cell-text-editor']").type("#ff00ff{enter}")
      // verify that cell shows color swatch of appropriate color
      table.verifyCellSwatchColor(2, 2, "rgb(255, 0, 255)")

      cy.log("double-click to begin editing cell")
      table.getGridCell(2, 2).click()
      table.getGridCell(2, 2).dblclick()
      cy.wait(100) // Wait for the editing input to appear

      cy.log("click color swatch to bring up color palette")
      table.getGridCell(2, 2)
        .find("button.cell-edit-color-swatch") // Simplified selector
        .should('exist')
        .should('be.visible')
        .dblclick({ force: true }) // Double-click the button
      cy.wait(100) // Wait for the color palette to appear

      cy.log("click hue bar to change color")
      cy.get(`.react-colorful .react-colorful__hue [aria-label="Hue"]`).should('be.visible').click()
      cy.wait(100) // Wait for the color change to be reflected

      cy.log("verify that the color actually changed")
      table.verifyEditCellSwatchColor(2, 2, "rgb(0, 255,")

      cy.log("type escape key to dismiss color palette")
      cy.get(".react-colorful").type("{esc}")

      cy.log("verify that cell displays original color")
      table.verifyCellSwatchColor(2, 2, "rgb(255, 0, 255)")

      cy.log("double-click to begin editing cell again")
      table.getGridCell(2, 2).dblclick()
      cy.wait(100) // Wait for the editing input to appear

      cy.log("click color swatch to bring up color palette again")
      table.getGridCell(2, 2)
        .find("button.cell-edit-color-swatch") // Simplified selector
        .should('exist')
        .should('be.visible')
        .dblclick({ force: true }) // Double-click the button
      cy.wait(100) // Wait for the color palette to appear

      cy.log("click hue bar to change color again")
      cy.get(`.react-colorful .react-colorful__hue [aria-label="Hue"]`).should('be.visible').click()
      cy.wait(100) // Wait for the color change to be reflected

      cy.log("verify that the color actually changed again")
      table.verifyEditCellSwatchColor(2, 2, "rgb(0, 255,")

      cy.log("click Set Color button to dismiss color palette and change color")
      cy.get(".text-editor-color-picker .set-color-button").should('be.visible').click()

      cy.log("verify that the color actually changed finally")
      table.verifyCellSwatchColor(2, 2, "rgb(0, 255,")
    })
})
})
