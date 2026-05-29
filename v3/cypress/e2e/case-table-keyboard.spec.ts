import { TableTileElements as table } from "../support/elements/table-tile"

// Keyboard data-entry behavior in the case table — CODAP-1365.
// Spec details on the Jira ticket; this spec exercises the navigation behaviors that
// the user is most likely to hit during data entry and the regressions we fought
// during implementation (Tab from EDIT mode losing focus, Shift-Tab landing on the
// resize widget, input-row commit-and-navigate, no-op commit Tab/Shift-Tab).

const queryParams = "?sample=mammals&dashboard&mouseSensor&noEntryModal&suppressUnsavedWarning"

const editor = "[data-testid=cell-text-editor]"
const selectedCell = '[role="gridcell"][aria-selected="true"]'

function expectSelectedColIndex(idx: number) {
  cy.get(selectedCell).should("have.attr", "aria-colindex", String(idx))
}

context("Case table keyboard data entry (CODAP-1365)", () => {
  beforeEach(() => {
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.get("[data-testid=tool-shelf]").should("be.visible")
    table.getCaseTableGrid().should("be.visible")
  })

  describe("Tab / Shift-Tab in EDIT mode", () => {
    it("Tab advances to next editable cell and keeps the editor open", () => {
      // Mammals attributes start at colindex 2 (1 = index column).
      // Edit row 2 (first data row), colindex 2 (Mammal).
      table.getGridCell(2, 2).dblclick()
      cy.get(editor).should("be.focused")
      cy.realPress("Tab")
      // Editor moves to colindex 3 (Order) on the same row, still in edit mode.
      cy.get(editor).should("be.focused")
      expectSelectedColIndex(3)
    })

    it("Shift-Tab moves backward to the previous editable cell, not the resize widget", () => {
      // Open editor on colindex 3 (Order).
      table.getGridCell(2, 3).dblclick()
      cy.get(editor).should("be.focused")
      cy.realPress(["Shift", "Tab"])
      // Editor moves to colindex 2 (Mammal). Focus stays in the grid, not on the
      // resize widget at the bottom of the case-table tile.
      cy.get(editor).should("be.focused")
      expectSelectedColIndex(2)
    })

    it("Tab from the input row's first column commits a new case and moves to the next cell", () => {
      // Use Cmd+End to scroll to the last data row — RDG's row virtualization means
      // setting scrollTop directly doesn't always render the input row, so we let our
      // own keyboard handler (which uses collectionTableModel.scrollRowToBottom) do it.
      table.getGridCell(2, 2).click()
      cy.realPress(["Meta", "End"])
      // Input row is just below the last data row — should now be in the DOM.
      // force: true because the row virtualization may re-render the input row mid-click.
      cy.get('[data-case-id="__input__"] [aria-colindex="2"]', { timeout: 4000 })
        .dblclick({ force: true })
      cy.get(editor).should("be.focused").type("test-mammal")
      cy.realPress("Tab")
      // After commit + nav: editor is open on the NEW case's colindex 3 (Order).
      cy.get(editor).should("be.focused")
      expectSelectedColIndex(3)
    })
  })

  describe("Return / Shift-Return in EDIT mode", () => {
    it("Return commits the edit and moves the editor down one row", () => {
      table.getGridCell(2, 2).dblclick()
      cy.get(editor).should("be.focused")
      cy.realPress("Enter")
      cy.get(editor).should("be.focused")
      // Same column, next row (rowindex 3 in DOM coords; header is rowindex 1).
      cy.get('[aria-rowindex="3"] [aria-colindex="2"]').should("have.attr", "aria-selected", "true")
    })

    it("Shift-Return moves the editor up one row", () => {
      table.getGridCell(3, 2).dblclick()
      cy.get(editor).should("be.focused")
      cy.realPress(["Shift", "Enter"])
      cy.get(editor).should("be.focused")
      cy.get('[aria-rowindex="2"] [aria-colindex="2"]').should("have.attr", "aria-selected", "true")
    })
  })

  describe("Entering edit mode from SELECT", () => {
    it("F2 opens the editor with the existing value selected", () => {
      // Click a cell with a value to put it in SELECT mode.
      table.getGridCell(2, 2).click()
      cy.realPress("F2")
      cy.get(editor).should("be.focused")
      // Selected text should equal the cell's content. We don't assert the value
      // (depends on the sample), but the selection range should cover the whole input.
      cy.get(editor).then($el => {
        const input = $el[0] as HTMLInputElement
        expect(input.selectionStart).to.equal(0)
        expect(input.selectionEnd).to.equal(input.value.length)
        expect(input.value.length).to.be.greaterThan(0)
      })
    })

    it("Typing a printable character enters edit mode and replaces the existing value", () => {
      table.getGridCell(2, 2).click()
      cy.realPress("x")
      cy.get(editor).should("be.focused").and("have.value", "x")
    })
  })

  describe("Escape", () => {
    it("Escape in EDIT mode cancels the edit and restores the original value", () => {
      // Capture the original value before editing.
      table.getCell(2, 2).invoke("text").then(originalText => {
        table.getGridCell(2, 2).dblclick()
        cy.get(editor).should("be.focused")
        // Clear and type a different value, then Escape.
        cy.get(editor).clear().type("changed-but-cancelled")
        cy.realPress("Escape")
        cy.get(editor).should("not.exist")
        // Cell value reverts to the original.
        table.getCell(2, 2).should("have.text", originalText)
      })
    })

    it("Escape in SELECT mode blurs the focused cell", () => {
      // Use realClick (a real DOM click via the native event system) so focus
      // actually lands on the cell. cy.click()'s synthetic events don't always
      // fire focus the way native interaction does.
      table.getGridCell(2, 2).realClick()
      cy.get(selectedCell).should("have.attr", "aria-colindex", "2")
      cy.realPress("Escape")
      // After Escape, no element inside the grid has focus.
      cy.document().its("activeElement").its("tagName").should("eq", "BODY")
    })
  })

  describe("Home / End in SELECT mode", () => {
    it("Home moves selection to the first editable column in the row", () => {
      // Click a cell partway through the row.
      table.getGridCell(2, 4).click()
      expectSelectedColIndex(4)
      cy.realPress("Home")
      // First editable column for mammals is colindex 2 (Mammal) — index column is colindex 1.
      expectSelectedColIndex(2)
    })

    it("End moves selection to the last editable column in the row", () => {
      table.getGridCell(2, 2).click()
      cy.realPress("End")
      // Last attribute column for the mammals sample. The sample has 9 attributes,
      // so the last is colindex 10 (1 index + 9 attributes).
      expectSelectedColIndex(10)
    })
  })
})
