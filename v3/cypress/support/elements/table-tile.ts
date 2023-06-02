export const TableTileElements = {
    getTableTile() {
        return cy.get(".codap-case-table")
    },
    getCaseTableGrid() {
        return cy.get("[data-testid=case-table] [role=grid]")
    },
    getNumOfAttributes() {
        return cy.get("[data-testid=case-table] [role=grid]").invoke("attr", "aria-colcount")
    },
    getNumOfCases() {
        return cy.get("[data-testid=case-table] [role=grid]").invoke("attr", "aria-rowcount")
    },
    getCollectionTitle() {
        return this.getTableTile().find("[data-testid=editable-component-title]")
    },
    getColumnHeaders() {
        return cy.get("[data-testid=case-table] [role=columnheader]")
    },
    getColumnHeader(index) {
        return cy.get(".codap-column-header-content").eq(index)
    },
    getColumnHeaderTooltip() {
        return cy.get("[data-testid=case-table-attribute-tooltip]")
    },
    openIndexMenuForRow(rowNum) {
        cy.get(`[data-testid=case-table] [role=grid] [role=row][aria-rowindex="${rowNum}"]
            [data-testid=codap-index-content-button]`).click("top")
    },
    getIndexMenu() {
        return cy.get("[data-testid=index-menu-list]")
    },
    insertCase() {
        this.getIndexMenu().should("be.visible")
        cy.clickMenuItem("Insert Case")
        cy.wait(500)
    },
    insertCases(num_of_cases, location) {
        this.getIndexMenu().should("be.visible")
        cy.clickMenuItem("Insert Cases...")
        cy.get("[data-testid=num-case-input] input").type(num_of_cases)
        cy.get(`[data-testid="add-${location}"]`).click()
        cy.get("[data-testid=\"Insert Cases-button\"]").contains("Insert Cases").click()
    },
    deleteCase() {
        this.getIndexMenu().should("be.visible")
        cy.clickMenuItem("Delete Case")
        cy.wait(500)
    },
    getInsertCasesModalHeader() {
        return cy.get("[data-testid=codap-modal-header]")
    },
    closeInsertCasesModal() {
        cy.get("[data-testid=modal-close-button]").click()
    },
    cancelInsertCasesModal() {
        cy.get("[data-testid=Cancel-button]").click()
    },
    getAttributeHeader() {
        return cy.get("[data-testid^=codap-attribute-button]")
    },
    getAttribute(name) {
        return cy.get(`[data-testid^="codap-attribute-button ${name}"]`)
    },
    openAttributeMenu(name) {
        this.getAttribute(name).click()
    },
    getAttributeMenuItem(item) {
        return cy.get("[data-testid=attribute-menu-list] button").contains(item)
    },
    selectMenuItemFromAttributeMenu(item) {
        this.getAttributeMenuItem(item).click({force:true})
    },
    renameColumnName(newName) {
        cy.get("[data-testid=column-name-input").type(newName)
    },
    // Edit Attribute Property Dialog
    enterAttributeName(name) {
        cy.get("[data-testid=attr-name-input]").type(name)
    },
    enterAttributeDescription(text) {
        cy.get("[data-testid=attr-description-input]").type(text)
    },
    selectAttributeType(type) {
        cy.get("[data-testid=attr-type-select]").select(type)
    },
    enterAttributeUnit(unit) {
        cy.get("[data-testid=attr-unit-input]").type(unit)
    },
    selectAttributePrecision(number) {
        cy.get("[data-testid=attr-precision-select]").select(number)
    },
    selectAttributeEditableState(state) {
        cy.get("[data-testid=attr-editable-radio] span").contains(state).click()
    },
    getApplyButton() {
        return cy.get("[data-testid=Apply-button]")
    },
    editAttributeProperty(attr, name, description, type, unit, precision, editable) {
        this.openAttributeMenu(attr)
        this.selectMenuItemFromAttributeMenu("Edit Attribute Properties...")
        if (name!=="") {
            this.enterAttributeName(`{selectAll}{backspace}${name}`)
        }
        if (description!=null) {
            this.enterAttributeDescription(`{selectAll}{backspace}${description}`)
        }
        if (type!=null) {
            this.selectAttributeType(type)
        }
        if (unit!=null) {
            this.enterAttributeUnit(`{selectAll}{backspace}${unit}`)
        }
        if (precision!=null) {
            this.selectAttributePrecision(precision)
        }
        if (editable!=null) {
            this.selectAttributeEditableState(editable)
        }
        this.getApplyButton().click()

    },
    getCell(line, row) {
        return cy.get(`[data-testid=case-table] [aria-rowindex="${row}"] [aria-colindex="${line}"] .cell-span`)
    },
    verifyRowSelected(row) {
        cy.get(`[data-testid=case-table] [aria-rowindex="${row}"]`).invoke("attr", "aria-selected")
        .should("contain", true)
    },
    verifyRowSelectedWithCellValue(cell) {
        cy.get(`[data-testid=case-table] [aria-selected=true]`).should("contain", cell)
    },
    openInspectorPanel() {
      this.getTableTile().click()
    },
    showAllAttributes() {
      cy.get("[data-testid=hide-show-button]").click()
      cy.get("[data-testid=hide-show-menu-list").find("button").contains("Show Hidden Attribute").click()
    }
}
