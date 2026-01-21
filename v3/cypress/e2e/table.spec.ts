import { CfmElements as cfm } from "../support/elements/cfm"
import { ComponentElements as c } from "../support/elements/component-elements"
import { TableTileElements as table } from "../support/elements/table-tile"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"

context("case table ui", () => {
  const numOfAttributes = 10
  const collectionName = "Cases"

  beforeEach(() => {
    // cy.scrollTo() doesn't work as expected with `scroll-behavior: smooth`
    const queryParams = "?sample=mammals&scrollBehavior=auto&suppressUnsavedWarning"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(1000)
    table.getNumOfAttributes().should("equal", numOfAttributes.toString())
  })

  describe("table view", () => {
    it("has a valid title bar and column headers", () => {
      cy.log("populates title bar from sample data")
      c.getComponentTitle("table").should("contain", collectionName)

      cy.log("verify columns and tooltips")
      // css width specification caused grid virtualization to only have 9 attributes in the DOM
      table.getColumnHeaders().should("have.length.be.within", 9, 10)
      table.getColumnHeader(0).invoke("text").then(columnName => {
        // const columnNameArr = columnName.split()
        table.getColumnHeader(0).click({ force: true })
        // table.getColumnHeaderTooltip().should("contain", columnNameArr[0])
      })
      table.getColumnHeader(1).invoke("text").then(columnName => {
        // const columnNameArr = columnName.split(" ")
        table.getColumnHeader(1).click({ force: true })
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
  // TODO: add tests for: Rerandomize All, Export Case Data, Import Case Data from Clipboard (PT: #184432150)
  describe("case table Inspector menu options", () => {
    it("should open dataset information button and make changes", () => {
      const newInfoName = "Animals",
        newSource = "The Internet",
        importDate = "May 4, 2021",
        newDescription = "All about mammals"

      // Enter new dataset information
      c.selectTile("table", 0)
      table.editDatasetInformation(newInfoName, newSource, importDate, newDescription)
      table.getDatasetInfoButton().click()

      // Checks that the new description information is filled in
      cy.get("[data-testid='dataset-name-input']").should("have.value", newInfoName)
      cy.get("[data-testid='dataset-source-input']").should("have.value", newSource)
      cy.get("[data-testid='dataset-date-input']").should("have.value", "5/4/2021")
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

    it("behaves as expected with a filter formula", () => {
      let initialCaseCount = 0

      const caseCount = (rowCount?: string) => rowCount ? +rowCount - 2 : 0

      // Get initial row count
      table.getNumOfRows().then(rowCount => {
        initialCaseCount = caseCount(rowCount)
      })

      // add a filter formula
      table.addFilterFormulaInModal(`Diet="meat"`)
      table.getNumOfRows().then(rowCount => expect(caseCount(rowCount)).to.eq(11))

      // change the filter formula
      table.addFilterFormulaInModal(`Diet="plants"`)
      table.getNumOfRows().then(rowCount => expect(caseCount(rowCount)).to.eq(7))

      // remove the filter formula
      table.addFilterFormulaInModal("")
      table.getNumOfRows().then(rowCount => expect(caseCount(rowCount)).to.eq(initialCaseCount))

      // undo the removal of the filter formula
      toolbar.getUndoTool().click()
      table.getNumOfRows().then(rowCount => expect(caseCount(rowCount)).to.eq(7))

      // undo the filter formula change
      toolbar.getUndoTool().click()
      table.getNumOfRows().then(rowCount => expect(caseCount(rowCount)).to.eq(11))

      // undo the addition of the filter formula
      toolbar.getUndoTool().click()
      table.getNumOfRows().then(rowCount => expect(caseCount(rowCount)).to.eq(initialCaseCount))

      // redo the addition of the filter formula
      toolbar.getRedoTool().click()
      table.getNumOfRows().then(rowCount => expect(caseCount(rowCount)).to.eq(11))

      // redo the change of the filter formula
      toolbar.getRedoTool().click()
      table.getNumOfRows().then(rowCount => expect(caseCount(rowCount)).to.eq(7))

      // redo the removal of the filter formula
      toolbar.getRedoTool().click()
      table.getNumOfRows().then(rowCount => expect(caseCount(rowCount)).to.eq(initialCaseCount))
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

    it("can reach the cfm to export data", () => {
      cy.log("check reaching the cfm to export data with one collection")
      c.selectTile("table", 0)
      table.getRulerButton().click()
      table.getExportDataItem().click()
      table.getCfmModal().should("exist")

      cy.log("check reaching the cfm to export data with multiple collections")
      const queryParams = "?suppressUnsavedWarning&mouseSensor=#file=examples:Four%20Seals"
      const url = `${Cypress.config("index")}${queryParams}`
      cy.visit(url)
      cy.wait(1000)
      c.selectTile("table", 0)
      table.getRulerButton().click()
      table.getExportDataItem().click()
      table.getExportDataModalBody().should("contain", "Export the case data, from:")
      table.getExportDataCollectionsButton().click()
      table.getExportDataCollectionList().should("exist")
      table.getExportDataCollectionListItems().should("have.length", 3)
      table.getExportDataCollectionListItems().contains("Tracks").click()
      table.getExportDataExportButton().click()
      table.getCfmModal().should("exist")
    })

    it("can copy data to the clipboard", () => {
      // The following allows Cypress to copy data to the clipboard
      // It was taken from: https://github.com/cypress-io/cypress/issues/2752#issuecomment-934864818
      cy.wrap(Cypress.automation('remote:debugger:protocol', {
        command: 'Browser.grantPermissions',
        params: { permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'], },
      })).then(() => {
        cy.log("check copying data from a single collection")
        c.selectTile("table", 0)
        table.getRulerButton().click()
        table.getCopyToClipboardItem().click()
        table.getCopiedCasesAlert().should("contain", "Copied 27 Cases to the clipboard")
        table.getCopiedCasesAlertOkButton().click()

        cy.log("check copying data from multiple collections")
        const queryParams = "?suppressUnsavedWarning&mouseSensor=#file=examples:Four%20Seals"
        const url = `${Cypress.config("index")}${queryParams}`
        cy.visit(url)
        cy.wait(1000)
        c.selectTile("table", 0)
        table.getRulerButton().click()
        table.getCopyToClipboardItem().click()
        table.getExportDataModalBody().should("contain", "Copy case data from:")
        table.getExportDataCollectionsButton().click()
        table.getExportDataCollectionList().should("exist")
        table.getExportDataCollectionListItems().should("have.length", 3)
        table.getExportDataCollectionListItems().contains("Tracks").click()
        table.getExportDataCopyButton().click()
        table.getCopiedCasesAlert().should("contain", "Copied 4 Tracks to the clipboard")
        table.getCopiedCasesAlertOkButton().click()

        cy.log("check new table from clipboard")
        cfm.openExampleDocument("Mammals")
        cy.wait(1000)  // Wait for document to load
        c.getComponentTile("table", 0).should("exist")  // Verify first table exists before proceeding
        c.clickIconFromToolShelf("table")
        toolbar.getNewCaseTableFromClipboard().click()
        c.getComponentTitle("table", 1).should("contain", "clipboard data")
        table.getAttributeHeader().should("contain", "animal id")
        table.getAttributeHeader().should("contain", "species")
        // Wait for clipboard data to be fully imported before checking row count
        // The table should have 6 rows: Header row + 4 data rows + 1 input row
        // Wait for data cells to appear before checking row count
        c.getComponentTile("table", 1).find(".rdg-cell").should("have.length.gte", 4)
        table.getNumOfRows(1, 1).should("eq", "6")
        c.closeComponent("table", 1)

        // TODO: Add test for importing data from clipboard into existing table.
        // I couldn't figure out how to confirm in the Importer plugin.
      })
    })
  })
  describe("case table header attribute menu", () => {
    it("verify add attribute with undo and redo", ()=>{
      // Add new attribute using Add New Attribute button (+)
      table.addNewAttribute()

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
        // verify cell background color is not white
        cy.wrap(cell).should("have.css", "background-color", "rgba(255, 255, 0, 0.2)")
      })
      // Rerandomize
      let random2 = 0
      table.openAttributeMenu("Height")
      table.selectMenuItemFromAttributeMenu("Rerandomize")
      // Wait for the cell value to change (rerandomize is async)
      table.getGridCell(2, 5).should($cell => {
        const value = +$cell.text()
        expect(value).to.not.eq(random1)
      })
      table.getGridCell(2, 5).then(cell => {
        random2 = +cell.text()
        expect(random2 >= 0).to.eq(true)
        expect(random2 < 1).to.eq(true)
        expect(random2).not.to.eq(random1)
      })

      cy.log("Delete formula, verify values remain")
      table.openAttributeMenu("Height")
      table.selectMenuItemFromAttributeMenu("Delete Formula (Keeping Values)")
      table.getGridCell(2, 5).then(cell => {
        const value = +cell.text()
        expect(value >= 0).to.eq(true)
        expect(value < 1).to.eq(true)
        expect(value).to.eq(random2)
      })

      cy.log("Verify that formula was deleted")
      table.openAttributeMenu("Height")
      table.getAttributeMenuItem("Rerandomize").should("be.disabled")
      table.getAttributeMenuItem("Delete Formula (Keeping Values)").should("be.disabled")

      cy.log("Undo formula deletion")
      let random3 = 0
      toolbar.getUndoTool().click()
      table.openAttributeMenu("Height")
      table.getAttributeMenuItem("Rerandomize").should("be.enabled")
      table.getAttributeMenuItem("Delete Formula (Keeping Values)").should("be.enabled")
      // Wait for the cell value to change (formula re-evaluation is async)
      table.getGridCell(2, 5).should($cell => {
        const value = +$cell.text()
        expect(value).to.not.eq(random2)
      })
      table.getGridCell(2, 5).then(cell => {
        random3 = +cell.text()
        expect(random3 >= 0).to.eq(true)
        expect(random3 < 1).to.eq(true)
        // restored formula is re-evaluated resulting in a different value
        expect(random3).not.to.eq(random2)
      })
      table.closeAttributeMenu()

      cy.log("Delete formula, then use recover formula")
      table.openAttributeMenu("Height")
      table.selectMenuItemFromAttributeMenu("Delete Formula (Keeping Values)")
      table.getGridCell(2, 5).then(cell => {
        const value = +cell.text()
        expect(value >= 0).to.eq(true)
        expect(value < 1).to.eq(true)
        // after deleting the formula the values should still match
        expect(value).to.eq(random3)
      })
      table.openAttributeMenu("Height")
      table.selectMenuItemFromAttributeMenu("Recover Deleted Formula")
      // Wait for the cell value to change (formula re-evaluation is async)
      table.getGridCell(2, 5).should($cell => {
        const value = +$cell.text()
        expect(value).to.not.eq(random3)
      })
      table.getGridCell(2, 5).then(cell => {
        const value = +cell.text()
        expect(value >= 0).to.eq(true)
        expect(value < 1).to.eq(true)
        // restored formula is re-evaluated resulting in a different value
        expect(value).to.not.eq(random3)
      })
    })
    it("verify sorting", () => {
      // sort by ascending Order
      table.openAttributeMenu("Order")
      table.selectMenuItemFromAttributeMenu("Sort Ascending")
      table.getGridCell(2, 2).should("contain", "Giraffe")
      // sort by descending Speed
      table.openAttributeMenu("Speed")
      table.selectMenuItemFromAttributeMenu("Sort Descending")
      table.getGridCell(2, 2).should("contain", "Cheetah")
      // undo Speed sort
      toolbar.getUndoTool().click()
      table.getGridCell(2, 2).should("contain", "Giraffe")
      // undo Order sort
      toolbar.getUndoTool().click()
      table.getGridCell(2, 2).should("contain", "African Elephant")
      // redo Order sort
      toolbar.getRedoTool().click()
      table.getGridCell(2, 2).should("contain", "Giraffe")
      // redo Speed sort
      toolbar.getRedoTool().click()
      table.getGridCell(2, 2).should("contain", "Cheetah")
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
})
