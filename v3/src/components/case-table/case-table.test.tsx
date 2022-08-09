import { render, screen } from "@testing-library/react"
import userEvent from '@testing-library/user-event'
import React from "react"
import { DataBroker } from "../../data-model/data-broker"
import { DataSet, toCanonical } from "../../data-model/data-set"
import { useKeyStates } from "../../hooks/use-key-states"
import { CaseTable } from "./case-table"

// used by case table
jest.mock("../../hooks/use-measure-text", () => ({
  measureText: (text: string) => text.length * 6
}))

const UseKeyStatesWrapper = () => {
  useKeyStates()
  return null
}

describe("Case Table", () => {
  let broker: DataBroker
  beforeEach(() => {
    broker = new DataBroker()
  })

  it("renders nothing with no broker", () => {
    render(<CaseTable />)
    expect(screen.queryByTestId("case-table")).not.toBeInTheDocument()
  })

  it("renders nothing with empty broker", () => {
    render(<CaseTable broker={broker} />)
    expect(screen.queryByTestId("case-table")).not.toBeInTheDocument()
  })

  it("renders table with data", () => {
    const data = DataSet.create()
    data.addAttribute({ name: "a"} )
    data.addAttribute({ name: "b" })
    data.addCases(toCanonical(data, [{ a: 1, b: 2 }, { a: 3, b: 4 }]))
    broker.addDataSet(data)
    render(<CaseTable broker={broker} />)
    expect(screen.getByTestId("case-table")).toBeInTheDocument()
  })

  it("selects rows when index cell is clicked", async () => {
    const user = userEvent.setup()
    const data = DataSet.create()
    data.addAttribute({ name: "a"} )
    data.addAttribute({ name: "b" })
    data.addCases(toCanonical(data, [{ a: 1, b: 2 }, { a: 3, b: 4 }]))
    broker.addDataSet(data)
    const { rerender } = render((
      <>
        <UseKeyStatesWrapper/>
        <CaseTable broker={broker} />
      </>
    ))
    expect(screen.getByTestId("case-table")).toBeInTheDocument()
    const indexCells = screen.getAllByRole("rowheader")
    expect(indexCells.length).toBe(2)
    const indexContents =screen.getAllByTestId("codap-index-content")
    expect(indexContents.length).toBe(2)
    expect(data.selection.size).toBe(0)
    await user.click(indexContents[0])
    rerender((
      <>
        <UseKeyStatesWrapper/>
        <CaseTable broker={broker} />
      </>
    ))
    expect(data.selection.size).toBe(1)
    await user.keyboard('[ShiftLeft>]') // Press Shift (without releasing it)
    await user.click(indexContents[1])
    expect(data.selection.size).toBe(2)
  })
})
