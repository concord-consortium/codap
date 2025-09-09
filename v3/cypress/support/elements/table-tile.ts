import { ComponentElements as c } from "./component-elements"
import { FormulaHelper as fh } from "../helpers/formula-helper"

type TestAttributes = Array<{ name: string, move: string }>
type TestValues = Record<string, string[]>

type OptString = string | null | undefined

const isMac = navigator.platform.toLowerCase().includes("mac")
const metaCtrlKey = isMac ? "Meta" : "Control"

export const TableTileElements = {
  getTableTile(index = 0) {
    return c.getComponentTile("table", index)
  },
  getCaseTableGrid() {
    return cy.get("[data-testid=collection-table-grid]")
  },
  getCaseTableGridForCollection(collectionIndex = 1) {
    return this.getCollection(collectionIndex).find("[data-testid=collection-table-grid]")
  },
  getNumOfAttributes() {
    return cy.get("[data-testid=collection-table-grid]").invoke("attr", "aria-colcount")
  },
  getNumOfRows(collectionIndex = 1, tableIndex = 0) {
    return this.getCollection(collectionIndex, tableIndex).find("[data-testid=collection-table-grid]")
      .invoke("attr", "aria-rowcount")
  },
  getSelectedRows(collectionIndex = 1) {
    return this.getCollection(collectionIndex)
            .find(`[data-testid=collection-table-grid] [role="row"][aria-selected="true"]`)
  },
  getCollection(collectionIndex = 1, tableIndex = 0) {
    return this.getTableTile(tableIndex).find(`.collection-table:nth-child(${collectionIndex})`)
  },
  getCollectionSpacer(collectionIndex = 1) {
    return this.getCollection(collectionIndex).find(".collection-table-spacer")
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
  getColumnHeader(index: number, collectionIndex = 1) {
    return this.getCollection(collectionIndex).find("[data-testid=codap-column-header-content]").eq(index)
  },
  // doesn't work in more recent chakra versions
  // getColumnHeaderTooltip() {
  //   return cy.get("[data-testid=case-table-attribute-tooltip]")
  // },
  getSelectedRow(rowNum: number, collectionIndex = 1) {
    return this.getCollection(collectionIndex).find(`[data-testid=collection-table-grid]
      [role=row][aria-rowindex="${rowNum}"][aria-selected="true"]`)
  },
  getIndexCellInRow(rowNum: number, collectionIndex = 1) {
    return this.getCollection(collectionIndex).find(`[data-testid=collection-table-grid]
      [role=row][aria-rowindex="${rowNum}"]
      [data-testid=codap-index-content-button]`)
  },
  openIndexMenuForRow(rowNum: number, collectionIndex = 1) {
    this.getIndexCellInRow(rowNum, collectionIndex).click()
  },
  getIndexMenu() {
    return cy.get("[data-testid=index-menu-list]")
  },
  moveInputRowUsingIndexMenu(rowNum = 0, collectionIndex = 1) {
    this.openIndexMenuForRow(rowNum, collectionIndex)
    this.getIndexMenu().should("be.visible")
    cy.clickMenuItem("Move Data Entry Row Here")
  },
  insertCase() {
    this.getIndexMenu().should("be.visible")
    cy.clickMenuItem("Insert Case")
  },
  insertCases(num_of_cases: number, location: string) {
    this.getIndexMenu().should("be.visible")
    cy.clickMenuItem("Insert Cases...")
    cy.get("[data-testid=num-case-input] input").type(`${num_of_cases}`)
    cy.get(`[data-testid="add-${location}"]`).click()
    cy.get("[data-testid=\"Insert Cases-button\"]").contains("Insert Cases").click()
  },
  deleteCase() {
    this.getIndexMenu().should("be.visible")
    cy.clickMenuItem("Delete Case")
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
  getAttribute(name: string, collectionIndex = 1) {
    const sanitizedName = name.trim()
    return this.getCollection(collectionIndex).find(`[data-testid="codap-attribute-button ${sanitizedName}"]`)
  },
  getAttributeInput(collectionIndex = 1) {
    return this.getCollection(collectionIndex).find("[data-testid=column-name-input]")
  },
  getCaseTableAttribute(name: string) {
    return this.getTableTile().find(`[data-testid^="codap-attribute-button ${name}"]`)
  },
  openAttributeMenu(name: string, collectionIndex = 1) {
    this.getAttribute(name, collectionIndex).click({force: true})
  },
  closeAttributeMenu() {
    cy.get("[data-testid=attribute-menu-list][style*='visibility: visible']").type("{esc}")
  },
  getAttributeMenuItem(item: string) {
    return cy.get("[data-testid=attribute-menu-list] button").contains(item)
  },
  selectMenuItemFromAttributeMenu(item: string) {
    this.getAttributeMenuItem(item).click({ force: true })
  },
  renameColumnName(newName: string) {
    cy.get("[data-testid=column-name-input]").wait(250).type(newName)
  },
  // Edit Attribute Property Dialog
  enterAttributeName(name: string) {
    cy.get("[data-testid=attr-name-input]").type(name)
  },
  enterAttributeDescription(text: string) {
    cy.get("[data-testid=attr-description-input]").type(text)
  },
  selectAttributeType(type: string) {
    cy.get("[data-testid=attr-type-select]").select(type)
  },
  enterAttributeUnit(unit: string) {
    cy.get("[data-testid=attr-unit-input]").type(unit)
  },
  selectAttributePrecision(precision: string) {
    cy.get("[data-testid=attr-precision-select]").select(precision)
  },
  selectAttributeEditableState(state: string) {
    cy.get("[data-testid=attr-editable-radio] span").contains(state).click()
  },
  // Edit Dataset Information Dialog
  enterInfoName(name: string) {
    cy.get("[data-testid=dataset-name-input]").type(name)
  },
  enterInfoSource(source: string) {
   cy.get("[data-testid=dataset-source-input]").type(source)
  },
  enterInfoDate(date: string) {
    cy.get("[data-testid=dataset-date-input]").type(date)
  },
  enterInfoDescription(description: string) {
    cy.get("[data-testid=dataset-description-input]").type(description)
  },
  getApplyButton() {
    return cy.get("[data-testid=Apply-button]")
  },
  getCancelButton() {
    return cy.get("[data-testid=Cancel-button]")
  },
  editAttributeProperties(attr: string, name?: OptString, description?: OptString, type?: OptString,
                          unit?: OptString, precision?: OptString, editable?: OptString) {
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
    this.getApplyButton().click({force: true})
  },
  editDatasetInformation(name: string, source: string, date: string, description: string) {
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
  getCell(column: number | string, row: number | string, collectionIndex = 1) {
    return this.getCollection(collectionIndex).find(`[aria-rowindex="${row}"] [aria-colindex="${column}"] .cell-span`)
  },
  typeInCell(column: number, row: number, text: string, collectionIndex = 1) {
    this.getGridCell(row, column, collectionIndex).dblclick()
    cy.wait(100) // Wait for the editing input to appear
    this.getGridCell(row, column, collectionIndex).find("[data-testid='cell-text-editor']").type(`${text}{enter}`)
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
  verifyRowSelected(row: number) {
    cy.get(`[data-testid=case-table] [aria-rowindex="${row}"]`).invoke("attr", "aria-selected")
      .should("contain", true)
  },
  verifyRowSelectedWithCellValue(cell: string) {
    cy.get(`[data-testid=case-table] [aria-selected=true]`).should("contain", cell)
  },
  showAllAttributes() {
    cy.get("[data-testid=hide-show-button]").click()
    // The show hidden attributes button is the only one with "Show" in it
    cy.get("[data-testid=hide-show-menu-list]").find("button").contains("Show").click()
  },
  createNewTableFromToolShelf() {
    c.getIconFromToolShelf("table").click()
    cy.clickWhenClickable("[data-testid=tool-shelf-table-new]")
  },
  createNewClipboardTableFromToolShelf() {
    c.getIconFromToolShelf("table").click()
    cy.clickWhenClickable("[data-testid=tool-shelf-table-new-clipboard]")
  },
  openExistingTableFromToolShelf(name: string) {
    c.getIconFromToolShelf("table").click()
    cy.clickWhenClickable(`[data-testid=tool-shelf-table-${name}]`)
  },
  deleteDataSetFromToolShelf(index = 0) {
    c.getIconFromToolShelf("table").click()
    cy.get(`.tool-shelf-menu-trash`).eq(index).should("be.visible").then($el => {
      cy.wrap($el).click()
    })
    cy.clickWhenClickable(`.delete-data-set-button-delete`)
  },
  getToggleCardView() {
    return cy.get("[data-testid=case-table-toggle-view]")
  },
  getToggleCardMessage() {
    return cy.get('[data-testid="card-table-toggle-message"]')
  },
  toggleCaseView() {
    this.getToggleCardView().click()
    cy.get("[data-testid=card-table-toggle-message]").click()
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
  getHideShowMenuItem(item: string | RegExp) {
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
  getExportDataItem() {
    return this.getRulerMenuItem("Export Case Data...")
  },
  getCopyToClipboardItem() {
    return this.getRulerMenuItem("Copy to Clipboard...")
  },
  getImportFromClipboardItem() {
    return this.getRulerMenuItem("Import Case Data from Clipboard...")
  },
  getCopiedCasesAlert() {
    return cy.get(".copied-cases-alert-content")
  },
  getCopiedCasesAlertOkButton() {
    return this.getCopiedCasesAlert().find("button").contains("OK")
  },
  getExportDataModalBody() {
    return cy.get(".export-data-modal-body")
  },
  getExportDataCollectionsButton() {
    return this.getExportDataModalBody().find(".collections-button")
  },
  getExportDataCollectionList() {
    return this.getExportDataModalBody().find(".collection-list")
  },
  getExportDataCollectionListItems() {
    return this.getExportDataCollectionList().find(".collection-list-item")
  },
  getExportDataButtons() {
    return cy.get(".export-data-modal-footer").find("button")
  },
  getExportDataCopyButton() {
    return this.getExportDataButtons().contains("Copy")
  },
  getExportDataExportButton() {
    return this.getExportDataButtons().contains("Export")
  },
  getCfmModal() {
    return cy.get("[data-testid=modal-dialog]")
  },
  verifyAttributeValues(attributes: TestAttributes, values: TestValues, collectionIndex = 1) {
    attributes.forEach(a => {
      const attribute = a.name
      for (let rowIndex = 0; rowIndex < values[attribute].length; rowIndex++) {
        this.getAttributeValue(attribute, rowIndex+2, collectionIndex).then(cell => {
          expect(values[attribute]).to.include(cell.text())
        })
      }
    })
  },
  getAttributeValue(attribute: string, rowIndex: number, collectionIndex = 1) {
    return this.getAttribute(attribute, collectionIndex).parent().parent().then($header => {
      return cy.wrap($header).invoke("attr", "aria-colindex").then(colIndex => {
        return this.getCell(colIndex!, rowIndex, collectionIndex)
      })
    })
  },
  moveAttributeToParent(name: string, moveType: string, targetNumber?: number) {
    c.selectTile("table", 0)
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
  verifyExpandAllGroupsButton(collectionIndex = 1) {
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
  getCollapsedIndex(rowIndex: number, collectionIndex = 1) {
    return this.getIndexCellInRow(rowIndex, collectionIndex)
  },
  getRowExpandCollapseButton(rowIndex: number, collectionIndex = 1) {
    return this.getCollection(collectionIndex).find(".spacer-mid-layer .expand-collapse-button img")
      .eq(Number(rowIndex)-2)
  },
  verifyRowCollapsedButton(rowIndex: number, collectionIndex = 1) {
    this.getRowExpandCollapseButton(rowIndex, collectionIndex).should("have.class", "closed")
  },
  verifyRowExpandedButton(rowIndex: number, collectionIndex = 1) {
    this.getRowExpandCollapseButton(rowIndex, collectionIndex).should("have.class", "open")
  },
  verifyCollapsedRows(childCases: string[], collectionIndex = 1) {
    for (let childCaseIndex = 0; childCaseIndex < childCases.length; childCaseIndex++) {
      this.getIndexCellInRow(childCaseIndex+2, collectionIndex).then(indexCell => {
        expect(childCases).to.include(indexCell.text())
      })
    }
  },
  addNewAttribute(collectionIndex = 1, attributeName?: string) {
    this.getCollection(collectionIndex).find("[data-testid=collection-add-attribute-icon-button] svg")
      .click({force:true})
    if (attributeName) {
      cy.wait(100)
      this.getAttributeInput(collectionIndex).type(`${attributeName}{enter}`)
    } else {
      cy.get("[data-testid=column-name-input]").type("{enter}{enter}")
    }
  },
  deleteAttribute(attributeName: string, collectionIndex = 1) {
    this.openAttributeMenu(attributeName, collectionIndex)
    this.selectMenuItemFromAttributeMenu("Delete Attribute")
    this.getAttribute(attributeName, collectionIndex).should("not.exist")
  },
  renameAttribute(attributeName: string, newAttributeName: string, collectionIndex = 1) {
    this.openAttributeMenu(attributeName, collectionIndex)
    this.selectMenuItemFromAttributeMenu("Rename")
    this.renameColumnName(`${newAttributeName}{enter}`)
    // this.getAttribute(newAttributeName, collectionIndex).should("exist")
  },
  addFormula(attributeName: string, formula: string, collectionIndex = 1) {
    this.openAttributeMenu(attributeName, collectionIndex)
    this.selectMenuItemFromAttributeMenu("Edit Formula...")
    this.addAttrFormulaInModal(attributeName, formula)
  },
  editFormula(attributeName: string, formula: string, collectionIndex = 1) {
    this.openAttributeMenu(attributeName, collectionIndex)
    this.selectMenuItemFromAttributeMenu("Edit Formula...")
    this.clearAttrFormulaInModal(attributeName)
    this.addFormula(attributeName, formula, collectionIndex)
  },
  checkFormulaExists(attributeName: string, formula: string, collectionIndex = 1) {
    this.openAttributeMenu(attributeName, collectionIndex)
    this.selectMenuItemFromAttributeMenu("Edit Formula...")
    this.checkAttrFormulaInModal(attributeName, formula)
  },
  addAttrFormulaInModal(attributeName: string, formula: string) {
    cy.get("[data-testid=attr-name-input]").invoke("attr", "value").should("eq", attributeName)
    cy.get("[data-testid=formula-editor-input] .cm-content").should("be.visible").and("have.focus")
    cy.get("[data-testid=formula-editor-input] .cm-content").realType(formula)
    cy.get("[data-testid=Apply-button]").click()
    cy.get("[data-testid=attr-name-input]").should("not.exist")
  },
  clearAttrFormulaInModal(attributeName: string) {
    cy.get("[data-testid=attr-name-input]").invoke("attr", "value").should("eq", attributeName)
    cy.get("[data-testid=formula-editor-input] .cm-content").should("be.visible").and("have.focus")
    cy.get("[data-testid=formula-editor-input] .cm-content").realPress([metaCtrlKey, "A"])
    cy.get("[data-testid=formula-editor-input] .cm-content").realType("{del}")
    cy.get("[data-testid=Apply-button]").click()
    cy.get("[data-testid=attr-name-input]").should("not.exist")
  },
  checkAttrFormulaInModal(attributeName: string, formula: string) {
    cy.get("[data-testid=attr-name-input]").invoke("attr", "value").should("eq", attributeName)
    cy.get("[data-testid=formula-editor-input] .cm-content").should("have.text", formula)
    cy.get("[data-testid=Cancel-button]").click()
    cy.get("[data-testid=attr-name-input]").should("not.exist")
  },
  addFilterFormulaInModal(formula: string) {
    this.getHideShowButton().click()
    this.getHideShowMenuItem(/(Add|Edit) Filter Formula.../).click()
    fh.clearFormulaInput()
    fh.addFilterFormula(formula)
    cy.get(".codap-modal-content [data-testid=Apply-button]").should("be.visible").click()
  },
  verifyFormulaValues(attribute: string, values: Array<any>, collectionIndex = 1) {
    for (let rowIndex = 0; rowIndex < values.length; rowIndex++) {
      this.getAttributeValue(attribute, rowIndex+2, collectionIndex).should("have.text", values[rowIndex].toString())
    }
  },
  verifyFormulaError(attribute: string, error: any, collectionIndex = 1) {
    for (let rowIndex = 0; rowIndex < error.cases; rowIndex++) {
      this.getAttributeValue(attribute, rowIndex+2, collectionIndex).should("have.text", error.value)
    }
  }
}
