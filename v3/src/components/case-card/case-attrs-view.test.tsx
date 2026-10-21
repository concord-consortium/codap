import { DndContext } from "@dnd-kit/core"
import { render, screen } from "@testing-library/react"
import { ITileSelection, TileSelectionContext } from "../../hooks/use-tile-selection-context"
import { CaseAttrsView } from "./case-attrs-view"

const tileSelection: ITileSelection = {
  isTileSelected: () => false,
  selectTile: () => undefined,
  addFocusIgnoreFn: () => () => null
}

describe("CaseAttrsView", () => {
  // Attribute-button testids are indexed within a collection, so each collection's attributes
  // need a wrapper testid to tell, e.g., the parent's first attribute from the child's.
  it("gives its wrapper a testid indexed by collection", () => {
    render(
      <DndContext>
        <TileSelectionContext.Provider value={tileSelection}>
          <CaseAttrsView collectionIndex={1} />
        </TileSelectionContext.Provider>
      </DndContext>)
    expect(screen.getByTestId("case-card-attrs-wrapper-1")).toHaveClass("case-card-attrs-wrapper")
  })
})
