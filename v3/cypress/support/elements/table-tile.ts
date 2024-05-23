import { ComponentElements as c } from "./component-elements"

export const TableTileElements = {
  getTableTile(index = 0) {
    return c.getComponentTile("table", index)
  },
  getCaseTableGrid() {
    return cy.get("[data-testid=collection-table-grid]")
  },
  getNumOfAttributes() {
    return cy.get("[data-testid=collection-table-grid]").invoke("attr", "aria-colcount")
  },
  getNumOfRows(collectionIndex = 1) {
    return this.getCollection(collectionIndex).find("[data-testid=collection-table-grid]")
      .invoke("attr", "aria-rowcount")
  },
  getCollection(collectionIndex = 1) {
    return this.getTableTile().find(`.collection-table:nth-child(${collectionIndex})`)
  },
  getCollectionTitle(collectionIndex = 1) {
    return this.getCollection(collectionIndex).find(".collection-title")
  },
  renameCollection(collectionName: string, oldName?: string, collectionIndex = 1) {
    this.getCollectionTitle(collectionIndex).click()
    if (oldName) {
      // NOTE This will leave the first letter of the old name until the UI for editing collection names is fixed
      const deleteCommand = oldName.split("").reduce(cmd => `${cmd}{backspace}`, "")
      this.getCollectionTitle(collectionIndex).find("input").type(deleteCommand)
    }
    this.getCollectionTitle(collectionIndex).find("input").type(`${collectionName}{enter}`)
  },
  getColumnHeaders(collectionIndex = 1) {
    return this.getCollection(collectionIndex).find("[role=columnheader]")
  },
  getColumnHeader(index, collectionIndex = 1) {
    return this.getCollection(collectionIndex).find("[data-testid=codap-column-header-content]").eq(index)
  },
  // doesn't work in more recent chakra versions
  // getColumnHeaderTooltip() {
  //   return cy.get("[data-testid=case-table-attribute-tooltip]")
  // },
  getIndexRow(rowNum: number, collectionIndex = 1) {
    return this.getCollection(collectionIndex).find(`[data-testid=collection-table-grid]
      [role=row][aria-rowindex="${rowNum}"]
      [data-testid=codap-index-content-button]`)
  },
  openIndexMenuForRow(rowNum: number, collectionIndex = 1) {
    this.getIndexRow(rowNum, collectionIndex).click("top")
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
  getAttribute(name, collectionIndex = 1) {
    return this.getCollection(collectionIndex).find(`[data-testid^="codap-attribute-button ${name}"]`)
  },
  getCasetableAttribute(name) {
    return this.getTableTile().find(`[data-testid^="codap-attribute-button ${name}"]`)
  },
  openAttributeMenu(name, collectionIndex = 1) {
    this.getAttribute(name, collectionIndex).click()
  },
  getAttributeMenuItem(item) {
    return cy.get("[data-testid=attribute-menu-list] button").contains(item)
  },
  selectMenuItemFromAttributeMenu(item) {
    this.getAttributeMenuItem(item).click({ force: true })
  },
  renameColumnName(newName) {
    cy.get("[data-testid=column-name-input]").type(newName)
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
  // Edit Dataset Information Dialog
  enterInfoName(name) {
    cy.get("[data-testid=dataset-name-input]").type(name)
  },
  enterInfoSource(source) {
   cy.get("[data-testid=dataset-source-input]").type(source)
  },
  enterInfoDate(date) {
    cy.get("[data-testid=dataset-date-input]").type(date)
  },
  enterInfoDescription(description) {
    cy.get("[data-testid=dataset-description-input]").type(description)
  },
  getApplyButton() {
    return cy.get("[data-testid=Apply-button]")
  },
  getCancelButton() {
    return cy.get("[data-testid=Cancel-button]")
  },
  editAttributeProperties(attr, name, description, type, unit, precision, editable) {
    this.openAttributeMenu(attr)
    this.selectMenuItemFromAttributeMenu("Edit Attribute Properties...")
    if (name !== "") {
      this.enterAttributeName(`{selectAll}{backspace}${name}`)
    }
    if (description != null) {
      this.enterAttributeDescription(`{selectAll}{backspace}${description}`)
    }
    if (type != null) {
      this.selectAttributeType(type)
    }
    if (unit != null) {
      this.enterAttributeUnit(`{selectAll}{backspace}${unit}`)
    }
    if (precision != null) {
      this.selectAttributePrecision(precision)
    }
    if (editable != null) {
      this.selectAttributeEditableState(editable)
    }
    this.getApplyButton().click()
  },
  editDatasetInformation(name, source, date, description) {
    this.getDatasetInfoButton().click()
    if (name !== "") {
       this.enterInfoName(`{selectAll}{backspace}${name}`)
    }
    if (source != null) {
       this.enterInfoSource(`{selectAll}{backspace}${source}`)
    }
    if (date != null) {
        this.enterInfoDate(`{selectAll}{backspace}${date}`)
    }
    if (description != null) {
      this.enterInfoDescription(`{selectAll}{backspace}${description}`)
    }
    this.getApplyButton().click()
   },
  getGridCell(row: number, column: number, collection = 1) {
    return this.getCollection(collection).find(`[aria-rowindex="${row}"] [aria-colindex="${column}"]`)
  },
  // returns the .cell-span within the cell
  getCell(column: number, row: number, collectionIndex = 1) {
    return this.getCollection(collectionIndex).find(`[aria-rowindex="${row}"] [aria-colindex="${column}"] .cell-span`)
  },
  verifyCellSwatchColor(row: number, column: number, rgbColorStr: string, collection = 1) {
    this.getGridCell(row, column, collection).find(".cell-color-swatch-interior").then($el => {
      return window.getComputedStyle($el[0])
    })
    .invoke("getPropertyValue", "background")
    .should("contain", rgbColorStr)
  },
  verifyEditCellSwatchColor(row: number, column: number, rgbColorStr: string, collection = 1) {
    this.getGridCell(row, column, collection).find(".cell-edit-color-swatch-interior").then($el => {
      return window.getComputedStyle($el[0])
    })
    .invoke("getPropertyValue", "background")
    .should("contain", rgbColorStr)
  },
  verifyRowSelected(row) {
    cy.get(`[data-testid=case-table] [aria-rowindex="${row}"]`).invoke("attr", "aria-selected")
      .should("contain", true)
  },
  verifyRowSelectedWithCellValue(cell) {
    cy.get(`[data-testid=case-table] [aria-selected=true]`).should("contain", cell)
  },
  showAllAttributes() {
    cy.get("[data-testid=hide-show-button]").click()
    cy.get("[data-testid=hide-show-menu-list]").find("button").contains("Show 1 Hidden Attribute").click()
  },
  createNewTableFromToolshelf() {
    c.getIconFromToolshelf("table").click()
    cy.get("[data-testid=tool-shelf-table-new]").click()
  },
  createNewClipboardTableFromToolshelf() {
    c.getIconFromToolshelf("table").click()
    cy.get("[data-testid=tool-shelf-table-new-clipboard]").click()
  },
  openExistingTableFromToolshelf(name) {
    c.getIconFromToolshelf("table").click()
    cy.get(`[data-testid=tool-shelf-table-${name}]`).click()
  },
  getToggleCardView() {
    return cy.get("[data-testid=case-table-toggle-view]")
  },
  getDatasetInfoButton() {
    return c.getInspectorPanel().find("[data-testid=dataset-info-button]")
  },
  getDatasetDescriptionTextArea() {
    return cy.get("[data-testid=dataset-description-input")
  },
  submitDatasetInfo() {
    cy.get("[data-testid=Apply-button]").click()
  },
  getResizeButton() {
    return c.getInspectorPanel().find("[data-testid=resize-table-button]")
  },
  getDeleteCasesButton() {
    return c.getInspectorPanel().find("[data-testid=delete-cases-button]")
  },
  getDeleteMenuItem(item: string) {
    return cy.get("[data-testid=trash-menu-list] button").contains(item)
  },
  selectItemFromDeleteMenu(item: string) {
    this.getDeleteMenuItem(item).click({ force: true })
  },
  getHideShowButton() {
    return c.getInspectorPanel().find("[data-testid=hide-show-button]")
  },
  getHideShowMenuItem(item: string) {
    return cy.get("[data-testid=hide-show-menu-list] button").contains(item)
  },
  getRulerButton() {
    return c.getInspectorPanel().find("[data-testid=ruler-button]")
  },
  getRulerMenuItem(item: string) {
    return cy.get("[data-testid=ruler-menu-list] button").contains(item)
  },
  selectItemFromRulerMenu(item: string) {
    this.getRulerMenuItem(item).click({ force: true })
  },
  verifyAttributeValues(attributes, values, collectionIndex = 1) {
    attributes.forEach(a => {
      const attribute = a.name
      for (let rowIndex = 0; rowIndex < values[attribute].length; rowIndex++) {
        cy.wait(1000)
        this.getAttributeValue(attribute, rowIndex+2, collectionIndex).then(cell => {
          expect(values[attribute]).to.include(cell.text())
        })
      }
    })
  },
  getAttributeValue(attribute, rowIndex, collectionIndex = 1) {
    return this.getAttribute(attribute, collectionIndex).parent().parent().then($header => {
      return cy.wrap($header).invoke("attr", "aria-colindex").then(colIndex => {
        return this.getCell(colIndex, rowIndex, collectionIndex)
      })
    })
  },
  moveAttributeToParent(name: string, moveType: string, targetNumber?: number) {
    cy.dragAttributeToTarget("table", name, moveType, targetNumber)
  },
  getExpandAllGroupsButton(collectionIndex = 1) {
    return this.getCollection(collectionIndex).find("[title=\"expand all groups\"]")
  },
  getCollapseAllGroupsButton(collectionIndex = 1) {
    return this.getCollection(collectionIndex).find("[title=\"collapse all groups\"]")
  },
  getNewCollectionDropZone(collectionIndex = 1) {
    return this.getCollection(collectionIndex).find(".collection-table-spacer.parentMost")
  },
  getPreviousCollectionHeader() {
    return cy.get(".collection-table:nth-child(1) .codap-column-header:nth-child(2)")
  },
  verifyExpandAllGroupseButton(collectionIndex = 1) {
    this.getExpandAllGroupsButton(collectionIndex).should("exist")
  },
  verifyCollapseAllGroupsButton(collectionIndex = 1) {
    this.getCollapseAllGroupsButton(collectionIndex).should("exist")
  },
  expandAllGroups(collectionIndex = 1) {
    this.getExpandAllGroupsButton(collectionIndex).click()
  },
  collapseAllGroups(collectionIndex = 1) {
    this.getCollapseAllGroupsButton(collectionIndex).click()
  },
  getCollapsedIndex(rowIndex, collectionIndex = 1) {
    return this.getIndexRow(rowIndex, collectionIndex)
  },
  getRowExpandCollapseButton(rowIndex, collectionIndex = 1) {
    return this.getCollection(collectionIndex).find(".spacer-mid-layer .expand-collapse-button img")
      .eq(Number(rowIndex)-2)
  },
  verifyRowCollapsedButton(rowIndex, collectionIndex = 1) {
    this.getRowExpandCollapseButton(rowIndex, collectionIndex).should("have.class", "closed")
  },
  verifyRowExpandedButton(rowIndex, collectionIndex = 1) {
    this.getRowExpandCollapseButton(rowIndex, collectionIndex).should("have.class", "open")
  },
  verifyCollapsedRows(childCases, collectionIndex = 1) {
    for (let childCaseIndex = 0; childCaseIndex < childCases.length; childCaseIndex++) {
      this.getIndexRow(childCaseIndex+2, collectionIndex).then(indexCell => {
        expect(childCases).to.include(indexCell.text())
      })
    }
  },
  addNewAttribute(collectionIndex = 1) {
    this.getCollection(collectionIndex).find("[data-testid=collection-add-attribute-icon-button] svg")
      .click({force:true})
  },
  deleteAttrbute(attributeName, collectionIndex = 1) {
    this.openAttributeMenu(attributeName, collectionIndex)
    this.selectMenuItemFromAttributeMenu("Delete Attribute")
    this.getAttribute(attributeName, collectionIndex).should("not.exist")
  },
  renameAttribute(attributeName, newAttributeName, collectionIndex = 1) {
    this.openAttributeMenu(attributeName, collectionIndex)
    this.selectMenuItemFromAttributeMenu("Rename")
    this.renameColumnName(`${newAttributeName}{enter}`)
    // this.getAttribute(newAttributeName, collectionIndex).should("exist")
  },
  addFormula(attributeName, formula, collectionIndex = 1) {
    this.openAttributeMenu(attributeName, collectionIndex)
    this.selectMenuItemFromAttributeMenu("Edit Formula...")
    this.addFormulaInModal(attributeName, formula)
  },
  editFormula(attributeName, formula, collectionIndex = 1) {
    this.openAttributeMenu(attributeName, collectionIndex)
    this.selectMenuItemFromAttributeMenu("Edit Formula...")
    this.clearFormulaInModal(attributeName)
    this.addFormula(attributeName, formula, collectionIndex)
  },
  checkFormulaExists(attributeName, formula, collectionIndex = 1) {
    this.openAttributeMenu(attributeName, collectionIndex)
    this.selectMenuItemFromAttributeMenu("Edit Formula...")
    this.checkFormulaInModal(attributeName, formula)
  },
  addFormulaInModal(attributeName, formula) {
    cy.get("[data-testid=attr-name-input]").invoke("attr", "value").should("eq", attributeName)
    cy.get("[data-testid=attr-formula-input]").type(formula, {force:true})
    cy.get("[data-testid=Apply-button]").click()
    cy.get("[data-testid=attr-name-input]").should("not.exist")
  },
  clearFormulaInModal(attributeName) {
    cy.get("[data-testid=attr-name-input]").invoke("attr", "value").should("eq", attributeName)
    cy.get("[data-testid=attr-formula-input]").type(`{selectAll}{del}`)
    cy.get("[data-testid=Apply-button]").click()
    cy.get("[data-testid=attr-name-input]").should("not.exist")
  },
  checkFormulaInModal(attributeName, formula) {
    cy.get("[data-testid=attr-name-input]").invoke("attr", "value").should("eq", attributeName)
    cy.get("[data-testid=attr-formula-input]").should("have.text", formula)
    cy.get("[data-testid=Cancel-button]").click()
    cy.get("[data-testid=attr-name-input]").should("not.exist")
  },
  verifyFormulaValues(attribute, values, collectionIndex = 1) {
    for (let rowIndex = 0; rowIndex < values.length; rowIndex++) {
      this.getAttributeValue(attribute, rowIndex+2, collectionIndex).should("have.text", values[rowIndex].toString())
    }
  },
  verifyFormulaError(attribute, error, collectionIndex = 1) {
    for (let rowIndex = 0; rowIndex < error.cases; rowIndex++) {
      this.getAttributeValue(attribute, rowIndex+2, collectionIndex).should("have.text", error.value)
    }
  },
  createNewDataset() {
    c.getIconFromToolshelf("table").click()
    cy.get("[data-testid=tool-shelf-table-new]").click()
  }
}
