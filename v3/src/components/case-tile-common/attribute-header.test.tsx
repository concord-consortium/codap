import { DndContext } from "@dnd-kit/core"
import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import React from "react"
import { DataSetContext } from "../../hooks/use-data-set-context"
import { ITileSelection, TileSelectionContext } from "../../hooks/use-tile-selection-context"
import { DataSet, toCanonical } from "../../models/data/data-set"
import { AttributeHeader } from "./attribute-header"

const tileSelection: ITileSelection = {
  isTileSelected: () => false,
  selectTile: () => undefined,
  addFocusIgnoreFn: () => () => null
}

function renderAttributeHeader(props: Partial<React.ComponentProps<typeof AttributeHeader>> = {}) {
  const data = DataSet.create()
  data.addAttribute({ name: "Species" })
  data.addCases(toCanonical(data, [{ Species: "Dog" }, { Species: "Cat" }]))
  const attribute = data.attributes[0]

  return {
    data,
    attribute,
    // dnd-kit's pointer sensor activates a drag on a synthetic click, which closes the menu
    // before it can open, so these tests exercise the non-draggable header.
    ...render(
      <DndContext>
        <TileSelectionContext.Provider value={tileSelection}>
          <DataSetContext.Provider value={data}>
            <AttributeHeader attributeId={attribute.id} draggable={false} {...props} />
          </DataSetContext.Provider>
        </TileSelectionContext.Provider>
      </DndContext>
    )
  }
}

describe("AttributeHeader", () => {
  // React warns about render-phase updates only once per rendering component per module
  // registry, so this must precede any other test in this file that opens the menu.
  it("opens and closes the attribute menu without triggering a render-phase state update", async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => null)

    try {
      const { attribute } = renderAttributeHeader()
      const button = screen.getByTestId(`codap-attribute-button ${attribute.name}`)
      await user.click(button)
      expect(button).toHaveAttribute("aria-expanded", "true")

      await user.keyboard("{Escape}")
      expect(button).toHaveAttribute("aria-expanded", "false")

      const renderPhaseWarnings = consoleErrorSpy.mock.calls
        .filter(args => String(args[0]).includes("Cannot update a component"))
      expect(renderPhaseWarnings).toEqual([])
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })

  it("notifies the parent when the menu opens and closes", async () => {
    const user = userEvent.setup()
    const onOpenMenu = jest.fn()
    const onCloseMenu = jest.fn()

    const { attribute } = renderAttributeHeader({ onOpenMenu, onCloseMenu })
    // no spurious notification on mount
    expect(onOpenMenu).not.toHaveBeenCalled()
    expect(onCloseMenu).not.toHaveBeenCalled()

    const button = screen.getByTestId(`codap-attribute-button ${attribute.name}`)
    await user.click(button)
    expect(onOpenMenu).toHaveBeenCalledTimes(1)
    expect(onCloseMenu).not.toHaveBeenCalled()

    await user.keyboard("{Escape}")
    expect(onCloseMenu).toHaveBeenCalledTimes(1)
    expect(onOpenMenu).toHaveBeenCalledTimes(1)
  })
})
