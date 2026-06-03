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
  const groupsGridName = t("V3.CaseTable.gridAriaLabel", { vars: ["groups"] })

  it("renders the parent collection's grid with only the index column when all its attributes are hidden", () => {
    // no custom env: the DataSet inherits the document's environment when the broker adds it.
    // The collections array includes the childmost collection, so attributes added without a
    // collection (here "value") land there, leaving "groups" as the parent collection.
    const data = DataSet.create({ name: "data", collections: [{ name: "groups" }, { name: "cases" }] })
    const groups = data.collections[0]
    const groupAttr = data.addAttribute({ name: "group" }, { collection: groups.id })
    data.addAttribute({ name: "value" }) // lands in the childmost collection
    data.addCases(toCanonical(data, [
      { group: "a", value: 1 }, { group: "a", value: 2 }, { group: "b", value: 3 }
    ]))
    data.validateCases()
    const { sharedMetadata } = broker.addDataSet(data)

    // with both collections fully visible, the parent grid has the index column + "group" column
    const { unmount } = renderTable(data)
    expect(screen.getAllByTestId("collection-table-grid")).toHaveLength(2)
    expect(screen.getByRole("grid", { name: groupsGridName })).toHaveAttribute("aria-colcount", "2")
    unmount()

    // hide the only attribute in the parent collection
    sharedMetadata.setIsHidden(groupAttr.id, true)

    renderTable(data)
    // both collections still render a grid (V2-style: the parent keeps its index column)
    expect(screen.getAllByTestId("collection-table-grid")).toHaveLength(2)
    // the parent grid is now index-only (the "group" attribute column is gone)
    expect(screen.getByRole("grid", { name: groupsGridName })).toHaveAttribute("aria-colcount", "1")
  })
})
