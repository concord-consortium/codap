import { DndContext } from "@dnd-kit/core"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { when } from "mobx"
import { DocumentContentContext } from "../../hooks/use-document-content"
import { appState } from "../../models/app-state"
import { TreeManagerType } from "../../models/history/tree-manager"
import { t } from "../../utilities/translation/translate"
import { kCalculatorTileType } from "./calculator-defs"
import "./calculator-registration"
import { CalculatorTitleBar } from "./calculator-title-bar"

describe("CalculatorTitleBar", () => {
  it("sends `show` when undo brings the closed calculator back and `hide` again on redo", async () => {
    const user = userEvent.setup()
    const { document } = appState
    const content = document.content!
    const tile = content.createOrShowTile(kCalculatorTileType)!
    render(
      <DocumentContentContext.Provider value={content}>
        <DndContext>
          <CalculatorTitleBar tile={tile} />
        </DndContext>
      </DocumentContentContext.Provider>
    )
    document.treeMonitor!.enableMonitoring()
    const settled = () => when(() => (document.treeManagerAPI as TreeManagerType).activeHistoryEntries.length === 0)
    const broadcastSpy = jest.spyOn(content, "broadcastMessage")
    const notices = () => broadcastSpy.mock.calls.map(([message]) => message)
      .filter(({ resource }) => resource === "component" || resource === "document")
      .map(({ resource, values }) => [resource, values.operation])

    await user.click(screen.getByLabelText(t("DG.Component.closeComponent.toolTip")))
    await act(() => settled())
    expect(content.isTileHidden(tile.id)).toBe(true)
    expect(notices()).toEqual([["component", "hide"]])
    broadcastSpy.mockClear()
    act(() => document.undoLastAction())
    await act(() => settled())
    expect(content.isTileHidden(tile.id)).toBe(false)
    expect(notices()).toEqual([["document", "undo"], ["component", "show"]])
    broadcastSpy.mockClear()
    act(() => document.redoLastAction())
    await act(() => settled())
    expect(notices()).toEqual([["document", "redo"], ["component", "hide"]])
    broadcastSpy.mockRestore()
    document.treeMonitor!.disableMonitoring()
  })
})
