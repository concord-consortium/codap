import { DndContext } from "@dnd-kit/core"
import { render, screen } from "@testing-library/react"
import { getSnapshot } from "mobx-state-tree"
import { CaseTableComponent } from "./case-table-component"
import { CaseTableModel } from "./case-table-model"
import { DataSetContext } from "../../hooks/use-data-set-context"
import { ITileSelection, TileSelectionContext } from "../../hooks/use-tile-selection-context"
import { createCodapDocument } from "../../models/codap/create-codap-document"
import { DataBroker } from "../../models/data/data-broker"
import { DataSet, IDataSet, toCanonical } from "../../models/data/data-set"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { ITileModel, TileModel } from "../../models/tiles/tile-model"
import { t } from "../../utilities/translation/translate"
import "./case-table-registration"

jest.mock("./case-table-shared.scss", () => ({
  headerRowHeight: "30"
}))

const tileSelection: ITileSelection = {
  isTileSelected() { return false },
  selectTile() {},
  addFocusIgnoreFn() { return () => null }
}

describe("Case Table with all attributes hidden in a collection", () => {
  let broker: DataBroker
  let tile: ITileModel

  beforeEach(() => {
    // a document provides the shared model manager that links a DataSet to its metadata,
    // which is the path useVisibleAttributes uses to determine which attributes are hidden
    const document = createCodapDocument()
    broker = new DataBroker({ sharedModelManager: getSharedModelManager(document) })
    tile = TileModel.create({ content: getSnapshot(CaseTableModel.create()) })
  })

  const renderTable = (data: IDataSet) =>
    render(
      <TileSelectionContext.Provider value={tileSelection}>
        <DndContext>
          <DataSetContext.Provider value={data}>
            <CaseTableComponent tile={tile}/>
          </DataSetContext.Provider>
        </DndContext>
      </TileSelectionContext.Provider>
    )

  // the grid's accessible name is "{collection name} data table" (V3.CaseTable.gridAriaLabel)
  const gridName = (collectionName: string) => t("V3.CaseTable.gridAriaLabel", { vars: [collectionName] })
  const renderedGridNames = () =>
    screen.queryAllByTestId("collection-table-grid").map(grid => grid.getAttribute("aria-label"))

  // Builds a hierarchical data set with one attribute per named collection and adds it to the broker.
  // Attributes added without a collection land in the childmost collection, so each attribute is
  // assigned to its collection explicitly.
  const createHierarchicalData = (collectionNames: string[]) => {
    // no custom env: the DataSet inherits the document's environment when the broker adds it.
    const data = DataSet.create({ name: "data", collections: collectionNames.map(name => ({ name })) })
    const attrIds = data.collections.map((collection, i) =>
      data.addAttribute({ name: `attr${i}` }, { collection: collection.id }).id)
    data.addCases(toCanonical(data, [
      { attr0: "a", attr1: "x", attr2: 1 }, { attr0: "a", attr1: "y", attr2: 2 }, { attr0: "b", attr1: "x", attr2: 3 }
    ]))
    data.validateCases()
    const { sharedMetadata } = broker.addDataSet(data)
    return { data, attrIds, sharedMetadata }
  }

  it("omits a parentmost collection whose attributes are all hidden", () => {
    const { data, attrIds, sharedMetadata } = createHierarchicalData(["groups", "cases"])

    // with both collections fully visible, the parent grid has the index column + its attribute column
    const { unmount } = renderTable(data)
    expect(renderedGridNames()).toEqual([gridName("groups"), gridName("cases")])
    expect(screen.getByRole("grid", { name: gridName("groups") })).toHaveAttribute("aria-colcount", "2")
    unmount()

    sharedMetadata.setIsHidden(attrIds[0], true)
    renderTable(data)
    expect(renderedGridNames()).toEqual([gridName("cases")])
  })

  it("omits a childmost collection whose attributes are all hidden", () => {
    const { data, attrIds, sharedMetadata } = createHierarchicalData(["groups", "cases"])
    sharedMetadata.setIsHidden(attrIds[1], true)
    renderTable(data)
    expect(renderedGridNames()).toEqual([gridName("groups")])
    // the attributes stay hidden rather than being shown again
    expect(sharedMetadata.isHidden(attrIds[1])).toBe(true)
  })

  it("omits a middle collection whose attributes are all hidden", () => {
    const { data, attrIds, sharedMetadata } = createHierarchicalData(["groups", "subgroups", "cases"])
    sharedMetadata.setIsHidden(attrIds[1], true)
    renderTable(data)
    expect(renderedGridNames()).toEqual([gridName("groups"), gridName("cases")])
  })

  it("renders only the childmost collection, index-only, when every attribute is hidden", () => {
    const { data, attrIds, sharedMetadata } = createHierarchicalData(["groups", "cases"])
    attrIds.forEach(attrId => sharedMetadata.setIsHidden(attrId, true))
    renderTable(data)
    expect(renderedGridNames()).toEqual([gridName("cases")])
    expect(screen.getByRole("grid", { name: gridName("cases") })).toHaveAttribute("aria-colcount", "1")
  })
})
