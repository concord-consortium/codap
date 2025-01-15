/* eslint-disable testing-library/no-container, testing-library/no-node-access */
import { render, screen } from "@testing-library/react"
import { userEvent } from '@testing-library/user-event'
import React from "react"
import { DG } from "../../v2/dg-compat.v2"
import { createDataSet } from "../../models/data/data-set-conversion"
import { DGDataContext } from "../../models/v2/dg-data-context"
import { t } from "../../utilities/translation/translate"
import "./case-card.v2"
import { SharedCaseMetadata } from "../../models/shared/shared-case-metadata"
import { AppHistoryService } from "../../models/history/app-history-service"
const { CaseCard } = DG.React as any

describe("CaseCard component", () => {
  jest.setTimeout(10000)
  const user = userEvent.setup()

  // https://github.com/jsdom/jsdom/issues/1590#issuecomment-1379728739
  const spy = jest.spyOn(window.HTMLElement.prototype, "getBoundingClientRect")
                  .mockImplementation(() => ({ x: 100, y: 100, width: 100, height: 20 }) as DOMRect)

  afterAll(() => {
    spy.mockRestore()
  })

  it("renders a flat data set", async () => {
    const data = createDataSet({
      attributes: [{ id: "AttrId", name: "AttrName" }]
    }, {historyService: new AppHistoryService()})
    data.addCases([{ __id__: "Case1", AttrId: "foo" }, { __id__: "Case2", AttrId: "bar" }])
    const context = new DGDataContext(data)
    const metadata = SharedCaseMetadata.create()
    const columnWidthMap: Record<string, number> = {}
    const mockIsSelected = jest.fn()
    const mockOnResizeColumn = jest.fn()
    const { container, rerender } = render(
      <CaseCard
        size={{ width: 400, height: 300 }}
        context={context}
        caseMetaData={metadata}
        columnWidthMap={columnWidthMap}
        onResizeColumn={() => mockOnResizeColumn()}
        isSelectedCallback={() => mockIsSelected()}
      />
    )
    const attrName = screen.getByText("AttrName")
    expect(attrName).toBeInTheDocument()

    // clicking right arrow navigates to first case
    const firstCaseButton = screen.getByTitle(t("DG.CaseCard.navFirstCase"))
    await user.click(firstCaseButton)
    rerender(
      <CaseCard
        size={{ width: 400, height: 300 }}
        context={context}
        caseMetaData={metadata}
        columnWidthMap={columnWidthMap}
        onResizeColumn={() => mockOnResizeColumn()}
        isSelectedCallback={() => mockIsSelected()}
      />
    )
    expect(screen.queryByTitle(t("DG.CaseCard.navFirstCase"))).toBeNull()
    // clicking value cell initiates editing
    const fooValue = screen.getByText("foo")
    expect(fooValue).toBeInTheDocument()
    await user.click(fooValue)
    rerender(
      <CaseCard
        size={{ width: 400, height: 300 }}
        context={context}
        caseMetaData={metadata}
        columnWidthMap={columnWidthMap}
        onResizeColumn={() => mockOnResizeColumn()}
        isSelectedCallback={() => mockIsSelected()}
      />
    )
    // clicking right arrow navigates to next (last) case
    const nextCaseButton = screen.getByTitle(t("DG.CaseCard.navNextCase"))
    await user.click(nextCaseButton)
    rerender(
      <CaseCard
        size={{ width: 400, height: 300 }}
        context={context}
        caseMetaData={metadata}
        columnWidthMap={columnWidthMap}
        onResizeColumn={() => mockOnResizeColumn()}
        isSelectedCallback={() => mockIsSelected()}
      />
    )
    expect(screen.queryByTitle(t("DG.CaseCard.navNextCase"))).toBeNull()
    // clicking left arrow navigates to previous (first) case
    const prevCaseButton = screen.getByTitle(t("DG.CaseCard.navPrevCase"))
    await user.click(prevCaseButton)
    rerender(
      <CaseCard
        size={{ width: 400, height: 300 }}
        context={context}
        caseMetaData={metadata}
        columnWidthMap={columnWidthMap}
        onResizeColumn={() => mockOnResizeColumn()}
        isSelectedCallback={() => mockIsSelected()}
      />
    )
    // clicking deselect button returns to summary view
    const deselectButton = screen.getByTitle(t("DG.CaseCard.deselect"))
    await user.click(deselectButton)
    rerender(
      <CaseCard
        size={{ width: 400, height: 300 }}
        context={context}
        caseMetaData={metadata}
        columnWidthMap={columnWidthMap}
        onResizeColumn={() => mockOnResizeColumn()}
        isSelectedCallback={() => mockIsSelected()}
      />
    )
    expect(screen.queryByTitle(t("DG.CaseCard.navPrevCase"))).toBeNull()
    expect(screen.queryByTitle(t("DG.CaseCard.navNextCase"))).toBeNull()
    const lastCaseButton = screen.getByTitle(t("DG.CaseCard.navLastCase"))
    await user.click(lastCaseButton)
    rerender(
      <CaseCard
        size={{ width: 400, height: 300 }}
        context={context}
        caseMetaData={metadata}
        columnWidthMap={columnWidthMap}
        onResizeColumn={() => mockOnResizeColumn()}
        isSelectedCallback={() => mockIsSelected()}
      />
    )

    // clicking new case button creates a new case and navigates to it
    // add case button
    const regex = /add\s*case/ // \s* matches any whitespace, including line breaks
    const addCaseButton = screen.getByText(regex)
    await user.click(addCaseButton)
    rerender(
      <CaseCard
        size={{ width: 400, height: 300 }}
        context={context}
        caseMetaData={metadata}
        columnWidthMap={columnWidthMap}
        onResizeColumn={() => mockOnResizeColumn()}
        isSelectedCallback={() => mockIsSelected()}
      />
    )
    expect(screen.getByText("1 selected of 3 Cases")).toBeInTheDocument()

    // clicking attribute name brings up menu
    await user.click(attrName)
    const renameItem = screen.getByText(t("DG.TableController.headerMenuItems.renameAttribute"))
    expect(renameItem).toBeInTheDocument()
    // clicking rename item dismisses menu
    await user.click(renameItem)
    expect(screen.queryByText(t("DG.TableController.headerMenuItems.renameAttribute"))).toBeNull()

    const resizeHandle = container.querySelector(".column-resize-handle")
    expect(resizeHandle).toBeInTheDocument()
    await user.click(resizeHandle!)

    // clicking new attribute button creates a new attribute
    const newAttrButton = screen.getByTitle(t("DG.TableController.newAttributeTooltip"))
    await user.click(newAttrButton)
  })

  it("renders a hierarchical data set", async () => {
    const data = createDataSet({
      attributes: [
        { id: "Attr1Id", name: "Attr1Name" },
        { id: "Attr2Id", name: "Attr2Name" }
      ]
    }, {historyService: new AppHistoryService()})
    const metadata = SharedCaseMetadata.create()
    data.addCases([
      { __id__: "Case1", Attr1Id: "foo", Attr2Id: 1 },
      { __id__: "Case2", Attr1Id: "foo", Attr2Id: 2 },
      { __id__: "Case3", Attr1Id: "bar", Attr2Id: 3 }
    ])
    data.moveAttributeToNewCollection("Attr1Id")
    const context = new DGDataContext(data)
    const columnWidthMap: Record<string, number> = {}
    const mockIsSelected = jest.fn()
    const mockOnResizeColumn = jest.fn()
    const { rerender } = render(
      <CaseCard
        size={{ width: 400, height: 300 }}
        context={context}
        caseMetaData={metadata}
        columnWidthMap={columnWidthMap}
        onResizeColumn={() => mockOnResizeColumn()}
        isSelectedCallback={() => mockIsSelected()}
      />
    )
    expect(screen.getByText("Attr1Name")).toBeInTheDocument()
    expect(screen.getByText("Attr2Name")).toBeInTheDocument()

    // clicking right arrow navigates to first case
    const firstCaseButtons = screen.getAllByTitle(t("DG.CaseCard.navFirstCase"))
    await user.click(firstCaseButtons[0])
    rerender(
      <CaseCard
        size={{ width: 400, height: 300 }}
        context={context}
        caseMetaData={metadata}
        columnWidthMap={columnWidthMap}
        onResizeColumn={() => mockOnResizeColumn()}
        isSelectedCallback={() => mockIsSelected()}
      />
    )
    expect(screen.queryByTitle(t("DG.CaseCard.navFirstCase"))).toBeNull()
    // clicking right arrow navigates to next (last) case
    const nextCaseButtons = screen.getAllByTitle(t("DG.CaseCard.navNextCase"))
    await user.click(nextCaseButtons[0])
    rerender(
      <CaseCard
        size={{ width: 400, height: 300 }}
        context={context}
        caseMetaData={metadata}
        columnWidthMap={columnWidthMap}
        onResizeColumn={() => mockOnResizeColumn()}
        isSelectedCallback={() => mockIsSelected()}
      />
    )
    expect(screen.queryByTitle(t("DG.CaseCard.navFirstCase"))).toBeNull()
    // clicking left arrow navigates to previous (first) case
    const prevCaseButtons = screen.getAllByTitle(t("DG.CaseCard.navPrevCase"))
    await user.click(prevCaseButtons[0])
    rerender(
      <CaseCard
        size={{ width: 400, height: 300 }}
        context={context}
        caseMetaData={metadata}
        columnWidthMap={columnWidthMap}
        onResizeColumn={() => mockOnResizeColumn()}
        isSelectedCallback={() => mockIsSelected()}
      />
    )
    // clicking deselect button returns to summary view
    const deselectButtons = screen.getAllByTitle(t("DG.CaseCard.deselect"))
    await user.click(deselectButtons[0])
    rerender(
      <CaseCard
        size={{ width: 400, height: 300 }}
        context={context}
        caseMetaData={metadata}
        columnWidthMap={columnWidthMap}
        onResizeColumn={() => mockOnResizeColumn()}
        isSelectedCallback={() => mockIsSelected()}
      />
    )
    expect(screen.queryByTitle(t("DG.CaseCard.navPrevCase"))).toBeNull()
    expect(screen.queryByTitle(t("DG.CaseCard.navNextCase"))).toBeNull()
    const lastCaseButtons = screen.getAllByTitle(t("DG.CaseCard.navLastCase"))
    await user.click(lastCaseButtons[0])
    rerender(
      <CaseCard
        size={{ width: 400, height: 300 }}
        context={context}
        caseMetaData={metadata}
        columnWidthMap={columnWidthMap}
        onResizeColumn={() => mockOnResizeColumn()}
        isSelectedCallback={() => mockIsSelected()}
      />
    )
  })
})
/* eslint-enable testing-library/no-container, testing-library/no-node-access */
