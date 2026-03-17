import { DndContext } from "@dnd-kit/core"
import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
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

function renderCollectionTitle(name: string, cases: Record<string, string>[]) {
  const attrName = Object.keys(cases[0])[0]
  const data = DataSet.create()
  data.addAttribute({ name: attrName })
  data.addCases(toCanonical(data, cases))
  const collection = data.collections[0]
  collection.setName(name)

  return { data, collection, ...render(
    <DndContext>
      <TileSelectionContext.Provider value={tileSelection}>
        <DataSetContext.Provider value={data}>
          <CollectionContext.Provider value={collection.id}>
            <CollectionTitle collectionIndex={0} showCount={true} />
          </CollectionContext.Provider>
        </DataSetContext.Provider>
      </TileSelectionContext.Provider>
    </DndContext>
  ) }
}

describe("CollectionTitle", () => {
  it("renders a preview with an aria-label that includes the collection name", () => {
    renderCollectionTitle("Mammals", [{ Species: "Dog" }, { Species: "Cat" }, { Species: "Horse" }])

    const preview = screen.getByLabelText(/Mammals.*Press Enter to edit/i)
    expect(preview).toBeInTheDocument()
    expect(preview.tagName).toBe("SPAN")
  })

  it("preview displays the collection name with case count", () => {
    renderCollectionTitle("Mammals", [{ Species: "Dog" }, { Species: "Cat" }])

    const preview = screen.getByText(/Mammals \(/)
    expect(preview).toBeInTheDocument()
    expect(preview).toHaveClass("collection-title-preview")
  })

  it("does not enter edit mode on focus — requires Enter key", async () => {
    const user = userEvent.setup()
    renderCollectionTitle("Animals", [{ Name: "Lion" }])

    // Preview is visible, input is not
    const preview = screen.getByLabelText(/Animals.*Press Enter to edit/i)
    expect(preview).toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()

    // Focus the preview — should NOT enter edit mode
    await user.tab()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()

    // Press Enter — should enter edit mode
    await user.keyboard("{Enter}")
    const input = screen.getByRole("textbox")
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute("aria-label", expect.stringMatching(/Edit collection name: Animals/i))
  })

  it("enters edit mode on double-click", async () => {
    const user = userEvent.setup()
    renderCollectionTitle("Animals", [{ Name: "Lion" }])

    const preview = screen.getByLabelText(/Animals.*Press Enter to edit/i)
    await user.dblClick(preview)

    const input = screen.getByRole("textbox")
    expect(input).toBeInTheDocument()
  })

  it("cancels editing on Escape, returns to preview, and restores focus", async () => {
    const user = userEvent.setup()
    renderCollectionTitle("Animals", [{ Name: "Lion" }])

    // Enter edit mode
    await user.tab()
    await user.keyboard("{Enter}")
    expect(screen.getByRole("textbox")).toBeInTheDocument()

    // Press Escape — should cancel, return to preview, and restore focus
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    const preview = screen.getByLabelText(/Animals.*Press Enter to edit/i)
    expect(preview).toBeInTheDocument()
    expect(preview).toHaveFocus()
  })

  it("edit input accepts typing and reflects changes", async () => {
    const user = userEvent.setup()
    renderCollectionTitle("Animals", [{ Name: "Lion" }])

    // Enter edit mode
    await user.tab()
    await user.keyboard("{Enter}")
    const input = screen.getByRole("textbox")

    // Input should start with the collection name selected
    expect(input).toHaveValue("Animals")

    // Type a new name
    await user.clear(input)
    await user.type(input, "Creatures")
    expect(input).toHaveValue("Creatures")
  })
})
