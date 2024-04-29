import { render, screen } from "@testing-library/react"
import { userEvent } from '@testing-library/user-event'
import React from "react"
import { DataSet } from "../../models/data/data-set"
import { DG } from "../../v2/dg-compat.v2"
import { DGDataContext } from "../../models/v2/dg-data-context"
import { t } from "../../utilities/translation/translate"
import "./attribute-name-cell.v2"
const { AttributeNameCell } = DG.React as any

describe("Case card AttributeNameCell", () => {
  const user = userEvent.setup()

  it("renders and responds to menu clicks", async () => {
    const data = DataSet.create({ name: "Context" })
    data.addAttribute({ id: "AttrID", name: "AttrName" })
    const context = new DGDataContext(data)
    const attribute = context.getAttribute("AttrID")

    const mockAttributeIsEditable = jest.fn(() => true)
    const mockAttributeCanBeHidden = jest.fn(() => true)
    const mockAttributeCanBeRandomized = jest.fn(() => false)
    const mockAttributeBeginRename = jest.fn()
    const mockEditAttribute = jest.fn()
    const mockColumnWidthChanged = jest.fn()
    const { rerender } = render(
      <table>
        <tbody>
          <tr>
            <AttributeNameCell
              content={attribute?.get("name")}
              attribute={attribute}
              attributeIsEditableCallback={mockAttributeIsEditable}
              attributeCanBeHiddenCallback={mockAttributeCanBeHidden}
              attributeCanBeRandomizedCallback={mockAttributeCanBeRandomized}
              onBeginRenameAttribute={mockAttributeBeginRename}
              editAttributeCallback={mockEditAttribute}
              onColumnWidthChanged={mockColumnWidthChanged}
            />
          </tr>
        </tbody>
      </table>
    )
    const nameElt = screen.getByText("AttrName")
    expect(nameElt).toBeInTheDocument()

    // clicking on name brings up menu
    await user.click(nameElt)
    const renameItem = screen.getByText(t('DG.TableController.headerMenuItems.renameAttribute'))
    // clicking on rename menu item calls a callback and closes the menu
    await user.click(renameItem)
    expect(mockAttributeBeginRename).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(t('DG.TableController.headerMenuItems.renameAttribute'))).toBeNull()

    // clicking on name brings up menu
    await user.click(nameElt)
    const editItem = screen.getByText(t('DG.TableController.headerMenuItems.editAttribute'))
    // clicking on rename menu item calls a callback and closes the menu
    await user.click(editItem)
    expect(mockEditAttribute).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(t('DG.TableController.headerMenuItems.editAttribute'))).toBeNull()

    // can re-render
    rerender(
      <table>
        <tbody>
          <tr>
            <AttributeNameCell
              content={attribute?.get("name")}
              attribute={attribute}
              attributeIsEditableCallback={mockAttributeIsEditable}
              attributeCanBeHiddenCallback={mockAttributeCanBeHidden}
              attributeCanBeRandomizedCallback={mockAttributeCanBeRandomized}
              onBeginRenameAttribute={mockAttributeBeginRename}
              editAttributeCallback={mockEditAttribute}
              onColumnWidthChanged={mockColumnWidthChanged}
            />
          </tr>
        </tbody>
      </table>
    )
    const _nameElt = screen.getByText("AttrName")
    expect(_nameElt).toBeInTheDocument()
  })

  it("renders with drag status for drags within the case card", async () => {
    const data = DataSet.create({ name: "Context" })
    data.addAttribute({ id: "AttrID", name: "AttrName" })
    const context = new DGDataContext(data)
    const attribute = context.getAttribute("AttrID")

    const mockAttributeIsEditable = jest.fn(() => true)
    const mockAttributeCanBeHidden = jest.fn(() => true)
    const mockAttributeCanBeRandomized = jest.fn(() => false)
    const mockAttributeBeginRename = jest.fn()
    const mockEditAttribute = jest.fn()
    const mockColumnWidthChanged = jest.fn()
    const dragStatus = {
      dragType: "ownContext",
      event: { clientX: 150, clientY: 110 }
    }
    // https://github.com/jsdom/jsdom/issues/1590#issuecomment-1379728739
    const spy = jest.spyOn(window.HTMLElement.prototype, "getBoundingClientRect")
                    .mockImplementation(() => ({ x: 100, y: 100, width: 100, height: 20 }) as DOMRect)
    const { rerender } = render(
      <table>
        <tbody>
          <tr>
            <AttributeNameCell
              content={attribute?.get("name")}
              attribute={attribute}
              attributeIsEditableCallback={mockAttributeIsEditable}
              attributeCanBeHiddenCallback={mockAttributeCanBeHidden}
              attributeCanBeRandomizedCallback={mockAttributeCanBeRandomized}
              onBeginRenameAttribute={mockAttributeBeginRename}
              editAttributeCallback={mockEditAttribute}
              onColumnWidthChanged={mockColumnWidthChanged}
              dragStatus={dragStatus}
            />
          </tr>
        </tbody>
      </table>
    )
    const nameElt = screen.getByText("AttrName")
    expect(nameElt).toBeInTheDocument()

    rerender(
      <table>
        <tbody>
          <tr>
            <AttributeNameCell
              content={attribute?.get("name")}
              attribute={attribute}
              attributeIsEditableCallback={mockAttributeIsEditable}
              attributeCanBeHiddenCallback={mockAttributeCanBeHidden}
              attributeCanBeRandomizedCallback={mockAttributeCanBeRandomized}
              onBeginRenameAttribute={mockAttributeBeginRename}
              editAttributeCallback={mockEditAttribute}
              onColumnWidthChanged={mockColumnWidthChanged}
              dragStatus={dragStatus}
            />
          </tr>
        </tbody>
      </table>
    )

    spy.mockRestore()
  })

  it("renders with drag status for drags from outside the case card", async () => {
    jest.useFakeTimers()

    const data = DataSet.create({ name: "Context" })
    data.addAttribute({ id: "AttrID", name: "AttrName" })
    const context = new DGDataContext(data)
    const collection = context.getCollectionForAttribute("AttrID")
    const attribute = context.getAttribute("AttrID")

    const mockAttributeIsEditable = jest.fn(() => true)
    const mockAttributeCanBeHidden = jest.fn(() => true)
    const mockAttributeCanBeRandomized = jest.fn(() => false)
    const mockAttributeBeginRename = jest.fn()
    const mockEditAttribute = jest.fn()
    const mockColumnWidthChanged = jest.fn()
    const dragStatus = {
      dragType: "foreignContext",
      event: { clientX: 150, clientY: 110 },
      dragObject: {
        data: { context, collection, attribute }
      }
    }
    // https://github.com/jsdom/jsdom/issues/1590#issuecomment-1379728739
    const spy = jest.spyOn(window.HTMLElement.prototype, "getBoundingClientRect")
                    .mockImplementation(() => ({ x: 100, y: 100, width: 100, height: 20 }) as DOMRect)
    const { rerender } = render(
      <table>
        <tbody>
          <tr>
            <AttributeNameCell
              content={attribute?.get("name")}
              attribute={attribute}
              attributeIsEditableCallback={mockAttributeIsEditable}
              attributeCanBeHiddenCallback={mockAttributeCanBeHidden}
              attributeCanBeRandomizedCallback={mockAttributeCanBeRandomized}
              onBeginRenameAttribute={mockAttributeBeginRename}
              editAttributeCallback={mockEditAttribute}
              onColumnWidthChanged={mockColumnWidthChanged}
              dragStatus={dragStatus}
            />
          </tr>
        </tbody>
      </table>
    )
    const nameElt = screen.getByText("AttrName")
    expect(nameElt).toBeInTheDocument()

    // second render required for the internal cellRef to be defined
    // should show the drag tip
    rerender(
      <table>
        <tbody>
          <tr>
            <AttributeNameCell
              content={attribute?.get("name")}
              attribute={attribute}
              attributeIsEditableCallback={mockAttributeIsEditable}
              attributeCanBeHiddenCallback={mockAttributeCanBeHidden}
              attributeCanBeRandomizedCallback={mockAttributeCanBeRandomized}
              onBeginRenameAttribute={mockAttributeBeginRename}
              editAttributeCallback={mockEditAttribute}
              onColumnWidthChanged={mockColumnWidthChanged}
              dragStatus={dragStatus}
            />
          </tr>
        </tbody>
      </table>
    )
    jest.runAllTimers()

    // third render without dragStatus should hide the drag tip
    rerender(
      <table>
        <tbody>
          <tr>
            <AttributeNameCell
              content={attribute?.get("name")}
              attribute={attribute}
              attributeIsEditableCallback={mockAttributeIsEditable}
              attributeCanBeHiddenCallback={mockAttributeCanBeHidden}
              attributeCanBeRandomizedCallback={mockAttributeCanBeRandomized}
              onBeginRenameAttribute={mockAttributeBeginRename}
              editAttributeCallback={mockEditAttribute}
              onColumnWidthChanged={mockColumnWidthChanged}
            />
          </tr>
        </tbody>
      </table>
    )
    jest.runAllTimers()

    spy.mockRestore()
  })
})
