/* eslint-disable testing-library/no-container, testing-library/no-node-access */
import { render, screen } from "@testing-library/react"
import React from "react"
import { DataSet } from "../../models/data/data-set"
import { DG } from "../../v2/dg-compat.v2"
import { DGDataContext } from "../../models/v2/dg-data-context"
import "./attribute-value-cell.v2"
const { AttributeValueCell } = DG.React as any

describe("Case card AttributeValueCell", () => {
  const mockDeselectCallback = jest.fn()
  const mockForceUpdateCallback = jest.fn()
  const mockOnEditModeCallback = jest.fn()
  const mockOnEscapeEditing = jest.fn()
  const mockOnToggleEditing = jest.fn()

  beforeEach(() => {
    mockDeselectCallback.mockReset()
    mockForceUpdateCallback.mockReset()
    mockOnEditModeCallback.mockReset()
    mockOnEscapeEditing.mockReset()
    mockOnToggleEditing.mockReset()
  })

  it("renders an empty cell with no case", async () => {
    const data = DataSet.create({ name: "Context" })
    data.addAttribute({ id: "AttrID" })
    const context = new DGDataContext(data)
    const attr = context.getAttribute("AttrID")
    const editProps = {
      isEditing: false,
      onToggleEditing: mockOnToggleEditing,
      onEscapeEditing: mockOnEscapeEditing,
      onEditModeCallback: mockOnEditModeCallback,
    }

    // renders the value by default
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <AttributeValueCell
              dataContext={context}
              attribute={attr}
              editProps={editProps}
              deselectCallback={mockDeselectCallback}
              forceUpdateCallback={mockForceUpdateCallback}
            />
          </tr>
        </tbody>
      </table>
    )
    const cell = container.querySelector("td")
    expect(cell).toBeInTheDocument()
  })

  it("renders a simple string value", async () => {
    const data = DataSet.create({ name: "Context" })
    data.addAttribute({ id: "AttrID" })
    data.addCases([{ __id__: "Case1", AttrID: "foo" }])
    const context = new DGDataContext(data)
    const attr = context.getAttribute("AttrID")
    const aCase = context.getCase("Case1")

    const editProps = {
      isEditing: false,
      onToggleEditing: mockOnToggleEditing,
      onEscapeEditing: mockOnEscapeEditing,
      onEditModeCallback: mockOnEditModeCallback,
    }

    // renders the value by default
    render(
      <table>
        <tbody>
          <tr>
            <AttributeValueCell
              dataContext={context}
              attribute={attr}
              displayCase={aCase}
              editProps={editProps}
              deselectCallback={mockDeselectCallback}
              forceUpdateCallback={mockForceUpdateCallback}
            />
          </tr>
        </tbody>
      </table>
    )
    const valueCell = screen.getByText("foo")
    expect(valueCell).toBeInTheDocument()
  })

  it("renders a checkbox value", async () => {
    const data = DataSet.create({ name: "Context" })
    data.addAttribute({ id: "AttrID", userType: "checkbox" })
    data.addCases([{ __id__: "Case1", AttrID: true }])
    const context = new DGDataContext(data)
    const attr = context.getAttribute("AttrID")
    const aCase = context.getCase("Case1")

    const editProps = {
      isEditing: false,
      onToggleEditing: mockOnToggleEditing,
      onEscapeEditing: mockOnEscapeEditing,
      onEditModeCallback: mockOnEditModeCallback,
    }

    // renders the value by default
    render(
      <table>
        <tbody>
          <tr>
            <AttributeValueCell
              dataContext={context}
              attribute={attr}
              displayCase={aCase}
              editProps={editProps}
              deselectCallback={mockDeselectCallback}
              forceUpdateCallback={mockForceUpdateCallback}
            />
          </tr>
        </tbody>
      </table>
    )
    const checkbox = screen.getByRole("checkbox")
    expect(checkbox).toBeChecked()
  })

  it("renders a summary of string values", async () => {
    const data = DataSet.create({ name: "Context" })
    data.addAttribute({ id: "AttrID" })
    data.addCases([{ __id__: "Case1", AttrID: "foo" }, { __id__: "Case2", AttrID: "bar" }])
    const context = new DGDataContext(data)
    const attr = context.getAttribute("AttrID")
    const aCase = context.getCase("Case1")
    const aCase2 = context.getCase("Case2")

    const editProps = {
      isEditing: false,
      onToggleEditing: mockOnToggleEditing,
      onEscapeEditing: mockOnEscapeEditing,
      onEditModeCallback: mockOnEditModeCallback,
    }

    // renders the value by default
    render(
      <table>
        <tbody>
          <tr>
            <AttributeValueCell
              dataContext={context}
              attribute={attr}
              displayCase={aCase}
              summaryCases={[aCase, aCase2]}
              editProps={editProps}
              deselectCallback={mockDeselectCallback}
              forceUpdateCallback={mockForceUpdateCallback}
            />
          </tr>
        </tbody>
      </table>
    )
    const summaryCell = screen.getByText("foo, bar")
    expect(summaryCell).toBeInTheDocument()
  })
})
/* eslint-enable testing-library/no-container, testing-library/no-node-access */
