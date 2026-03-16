import { DndContext } from "@dnd-kit/core"
import { render, screen } from "@testing-library/react"
import { DataSet, toCanonical } from "../../models/data/data-set"
import { DataSetContext } from "../../hooks/use-data-set-context"
import { CollectionContext } from "../../hooks/use-collection-context"
import { ITileSelection, TileSelectionContext } from "../../hooks/use-tile-selection-context"
import { CollectionTitle } from "./collection-title"

const tileSelection: ITileSelection = {
  isTileSelected: () => false,
  selectTile: () => undefined,
  addFocusIgnoreFn: () => () => null
}

describe("CollectionTitle", () => {
  it("renders an EditablePreview with an aria-label that includes the collection name", () => {
    const data = DataSet.create()
    data.addAttribute({ name: "Species" })
    data.addCases(toCanonical(data, [{ Species: "Dog" }, { Species: "Cat" }, { Species: "Horse" }]))
    const collection = data.collections[0]
    collection.setName("Mammals")

    render(
      <DndContext>
        <TileSelectionContext.Provider value={tileSelection}>
          <DataSetContext.Provider value={data}>
            <CollectionContext.Provider value={collection.id}>
              <CollectionTitle collectionIndex={0} showCount={true} />
            </CollectionContext.Provider>
          </DataSetContext.Provider>
        </TileSelectionContext.Provider>
      </DndContext>
    )

    // The preview should have an aria-label that includes the collection name
    const preview = screen.getByLabelText(/Collection Mammals/i)
    expect(preview).toBeInTheDocument()
    expect(preview.getAttribute("aria-label")).toMatch(/cases\. Press Enter to edit\./)
  })

  it("includes the collection name in the edit input aria-label", () => {
    const data = DataSet.create()
    data.addAttribute({ name: "Name" })
    data.addCases(toCanonical(data, [{ Name: "Lion" }]))
    const collection = data.collections[0]
    collection.setName("Animals")

    render(
      <DndContext>
        <TileSelectionContext.Provider value={tileSelection}>
          <DataSetContext.Provider value={data}>
            <CollectionContext.Provider value={collection.id}>
              <CollectionTitle collectionIndex={0} showCount={true} />
            </CollectionContext.Provider>
          </DataSetContext.Provider>
        </TileSelectionContext.Provider>
      </DndContext>
    )

    // The hidden edit input should have an aria-label with the collection name
    const input = screen.getByLabelText(/Edit collection name: Animals/i)
    expect(input).toBeInTheDocument()
  })
})
