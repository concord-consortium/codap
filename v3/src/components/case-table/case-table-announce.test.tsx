import { DndContext } from "@dnd-kit/core"
import { render, screen, act, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { getSnapshot, Instance, types } from "mobx-state-tree"
import { useCallback, useRef, useState } from "react"
import { DataSetContext } from "../../hooks/use-data-set-context"
import { DataSetMetadataContext } from "../../hooks/use-data-set-metadata"
import { InstanceIdContext } from "../../hooks/use-instance-id-context"
import { ITileSelection, TileSelectionContext } from "../../hooks/use-tile-selection-context"
import { DataSet, toCanonical } from "../../models/data/data-set"
import { symParent } from "../../models/data/data-set-types"
import { DataSetMetadata } from "../../models/shared/data-set-metadata"
import { TileModel } from "../../models/tiles/tile-model"
import { t } from "../../utilities/translation/translate"
import { CaseTable } from "./case-table"
import { CaseTableModel, ICaseTableModel } from "./case-table-model"
import "./case-table-registration"
import { TRow } from "./case-table-types"
import { CaseTableModelContext } from "./use-case-table-model"
import { CaseTableAnnounceContext, useCaseTableAnnounce } from "./use-case-table-announce"

jest.mock("./case-table-shared.scss", () => ({
  headerRowHeight: "30"
}))

jest.mock("../../models/history/history-service", () => ({
  getHistoryService: () => ({
    handleApplyModelChange: jest.fn()
  })
}))

const TreeModel = types.model("Tree", {
  data: DataSet,
  metadata: DataSetMetadata
})

const tileSelection: ITileSelection = {
  isTileSelected() { return false },
  selectTile() {},
  addFocusIgnoreFn() { return () => null }
}

describe("Case Table aria-live announcements", () => {
  describe("announce mechanism", () => {
    afterEach(() => {
      jest.useRealTimers()
    })

    // Test component that consumes the announce context
    function AnnounceConsumer({ message }: { message: string }) {
      const announce = useCaseTableAnnounce()
      return <button onClick={() => announce(message)}>announce</button>
    }

    function AnnounceTestWrapper({ message }: { message: string }) {
      const [statusMessage, setStatusMessage] = useState("")
      const statusTimeoutRef = useRef<number>()
      const announce = useCallback((msg: string) => {
        window.clearTimeout(statusTimeoutRef.current)
        setStatusMessage(msg)
        if (msg) {
          statusTimeoutRef.current = window.setTimeout(() => setStatusMessage(""), 1000)
        }
      }, [])

      return (
        <CaseTableAnnounceContext.Provider value={announce}>
          <AnnounceConsumer message={message} />
          <div aria-live="polite" role="status">{statusMessage}</div>
        </CaseTableAnnounceContext.Provider>
      )
    }

    it("updates the aria-live region when announce is called", async () => {
      const user = userEvent.setup()
      render(<AnnounceTestWrapper message="Test announcement" />)

      const statusRegion = screen.getByRole("status")
      expect(statusRegion).toHaveTextContent("")

      await user.click(screen.getByText("announce"))
      expect(statusRegion).toHaveTextContent("Test announcement")
    })

    it("clears the aria-live region after timeout", async () => {
      jest.useFakeTimers()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<AnnounceTestWrapper message="Temporary message" />)

      await user.click(screen.getByText("announce"))
      expect(screen.getByRole("status")).toHaveTextContent("Temporary message")

      act(() => { jest.advanceTimersByTime(1000) })
      expect(screen.getByRole("status")).toHaveTextContent("")
    })
  })

  describe("expand/collapse announcements", () => {
    let tree: Instance<typeof TreeModel>
    let tableModel: ICaseTableModel

    beforeEach(() => {
      tree = TreeModel.create({
        data: getSnapshot(DataSet.create()),
        metadata: getSnapshot(DataSetMetadata.create())
      })
      const data = tree.data
      data.addAttribute({ id: "aId", name: "a" })
      data.addAttribute({ id: "bId", name: "b" })
      // 3 groups of "a", each with 3 "b" values
      for (let a = 1; a <= 3; a++) {
        for (let b = 1; b <= 3; b++) {
          data.addCases(toCanonical(data, [{ a: `${a}`, b: `${b}` }]))
        }
      }
      // Create hierarchy: move "a" to parent collection
      data.moveAttributeToNewCollection("aId")
      data.validateCases()
      tree.metadata.setData(data)

      const tile = TileModel.create({ content: getSnapshot(CaseTableModel.create()) })
      tableModel = tile.content as ICaseTableModel

      // Pre-populate the child collection table model's rows so individual
      // expand/collapse buttons render (RDG doesn't populate rows in jsdom).
      const parentCollection = data.collections[0]
      const childCollection = data.collections[1]
      const childTableModel = tableModel.getCollectionTableModel(childCollection.id)
      const parentCases = data.getCasesForCollection(parentCollection.id)
      const childCases = data.getCasesForCollection(childCollection.id)
      const rows: TRow[] = childCases.map(c => {
        const parentCase = parentCases.find(pc => {
          const info = data.caseInfoMap.get(pc.__id__)
          return info?.childCaseIds?.includes(c.__id__) || info?.childItemIds?.includes(c.__id__)
        })
        return { __id__: c.__id__, [symParent]: parentCase?.__id__ ?? "" }
      })
      childTableModel.resetRows(rows)
    })

    function renderCaseTable() {
      return render(
        <DndContext>
          <TileSelectionContext.Provider value={tileSelection}>
            <InstanceIdContext.Provider value="test-case-table">
              <DataSetContext.Provider value={tree.data}>
                <DataSetMetadataContext.Provider value={tree.metadata}>
                  <CaseTableModelContext.Provider value={tableModel}>
                    <CaseTable />
                  </CaseTableModelContext.Provider>
                </DataSetMetadataContext.Provider>
              </DataSetContext.Provider>
            </InstanceIdContext.Provider>
          </TileSelectionContext.Provider>
        </DndContext>
      )
    }

    function getStatusRegion() {
      const caseTable = screen.getByTestId("case-table")
      return within(caseTable).getByRole("status")
    }

    beforeEach(() => {
      jest.spyOn(navigator, "languages", "get").mockReturnValue(["en-US"])
    })

    it("announces 'All groups collapsed' when collapse-all is clicked", async () => {
      const user = userEvent.setup()
      renderCaseTable()

      const collapseAllButton = screen.getByTitle(t("DG.CaseTable.dividerView.collapseAllTooltip"))
      await user.click(collapseAllButton)

      expect(getStatusRegion()).toHaveTextContent(t("V3.CaseTable.allGroupsCollapsed"))
    })

    it("announces 'All groups expanded' when expand-all is clicked", async () => {
      const user = userEvent.setup()
      renderCaseTable()

      // First collapse all, then expand all
      const button = screen.getByTitle(t("DG.CaseTable.dividerView.collapseAllTooltip"))
      await user.click(button)

      // After collapsing, the button tooltip changes to "expand all groups"
      const expandAllButton = screen.getByTitle(t("DG.CaseTable.dividerView.expandAllTooltip"))
      await user.click(expandAllButton)

      expect(getStatusRegion()).toHaveTextContent(t("V3.CaseTable.allGroupsExpanded"))
    })

    it("announces single group collapsed with case count", async () => {
      const user = userEvent.setup()
      renderCaseTable()

      // Individual buttons have aria-label "collapse group"
      const individualButtons = screen.getAllByRole(
        "button", { name: t("DG.CaseTable.dividerView.collapseGroupTooltip") }
      )
      expect(individualButtons.length).toBeGreaterThan(0)

      await user.click(individualButtons[0])

      expect(getStatusRegion()).toHaveTextContent(/Group collapsed, \d+ cases hidden/)
    })

    it("announces single group expanded with case count", async () => {
      const user = userEvent.setup()
      renderCaseTable()

      // Collapse a single group first
      const individualButtons = screen.getAllByRole(
        "button", { name: t("DG.CaseTable.dividerView.collapseGroupTooltip") }
      )
      await user.click(individualButtons[0])

      // Now expand it — the collapsed button now has aria-label "expand group"
      const expandButton = screen.getAllByRole(
        "button", { name: t("DG.CaseTable.dividerView.expandGroupTooltip") }
      )[0]
      await user.click(expandButton)

      expect(getStatusRegion()).toHaveTextContent(/Group expanded, \d+ cases shown/)
    })
  })
})
