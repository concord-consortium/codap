import { fireEvent, renderHook } from "@testing-library/react"
import { getType } from "mobx-state-tree"
import { DataSet, IDataSet } from "../data-model/data-set"
import { useDropHandler } from "./use-drop-handler"

const mockData = [{ a: 1, b: 2 }, { a: 3, b: 4 }]
const mockFilename = "mockFile.csv"

jest.mock("papaparse", () => ({
  // mock parse() to return mock data
  parse: (file: any, options: any) => {
    options.complete({ data: mockData }, { name: mockFilename })
  }
}))

describe("useDropHandler", () => {

  const mockDataTransferWithItems: any = {
    items: {
      length: 1,
      clear: () => null,
      "0": {
        kind: "file",
        getAsFile: () => ({ name: mockFilename })
      }
    }
  }

  const mockDataTransferWithoutItems: any = {
    clearData: () => null
  }

  it("ignores drops with invalid selector", () => {
    const handler = jest.fn()
    const params = { selector: "foo", onImportDataSet: handler, onImportDocument: handler }
    const { rerender, result } = renderHook(() => useDropHandler(params))
    rerender()  // make sure effect has a chance to run
    expect(result.current).toBeFalsy()
  })

  it("ignores drops without DataTransfer", () => {
    const handler = jest.fn()
    const params = { selector: "body", onImportDataSet: handler, onImportDocument: handler }
    const { rerender, result } = renderHook(() => useDropHandler(params))
    rerender()  // make sure effect has a chance to run
    expect(result.current).toBeTruthy()
    fireEvent.dragOver(result.current!)
    expect(handler).not.toHaveBeenCalled()
    fireEvent.drop(result.current!)
    expect(handler).not.toHaveBeenCalled()
  })

  it("handles drops with items", () => {
    const handler = jest.fn()
    const params = { selector: "body", onImportDataSet: handler, onImportDocument: handler }
    const { rerender, result } = renderHook(() => useDropHandler(params))
    rerender()  // make sure effect has a chance to run
    expect(result.current).toBeTruthy()
    fireEvent.dragOver(result.current!)
    expect(handler).not.toHaveBeenCalled()
    fireEvent.drop(result.current!, { dataTransfer: mockDataTransferWithItems })
    expect(handler).toHaveBeenCalled()
    const dsArg = handler.mock.calls[0][0] as IDataSet
    expect(getType(dsArg)).toEqual(DataSet)
  })

  it("ignores drops without items", () => {
    const handler = jest.fn()
    const params = { selector: "body", onImportDataSet: handler, onImportDocument: handler }
    const { rerender, result } = renderHook(() => useDropHandler(params))
    rerender()  // make sure effect has a chance to run
    expect(result.current).toBeTruthy()
    fireEvent.dragOver(result.current!)
    expect(handler).not.toHaveBeenCalled()
    fireEvent.drop(result.current!, { dataTransfer: mockDataTransferWithoutItems })
    expect(handler).not.toHaveBeenCalled()
  })
})
