import { fireEvent, renderHook } from "@testing-library/react"
import { useDropHandler } from "./use-drop-handler"

const mockData = [{ a: 1, b: 2 }, { a: 3, b: 4 }]
const mockFilename = "mockFile.csv"
const mockInitiateImportFromCsvFile = jest.fn()

jest.mock("papaparse", () => ({
  // mock parse() to return mock data
  parse: (file: any, options: any) => {
    options.complete({ data: mockData }, { name: mockFilename })
  }
}))

jest.mock("../utilities/csv-import", () => {
  return {
    initiateImportFromCsvFile: (file: File) => mockInitiateImportFromCsvFile(file)
  }
})

describe("useDropHandler", () => {

  const mockDataTransferWithItems: any = {
    items: {
      length: 1,
      clear: () => null,
      "0": {
        kind: "file",
        getAsFile: () => ({ name: mockFilename }) as File
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

  it("handles drops with file as DataTransfer item", () => {
    const handler = jest.fn()
    const params = { selector: "body", onImportDataSet: handler, onImportDocument: handler }
    const { rerender, result } = renderHook(() => useDropHandler(params))
    rerender()  // make sure effect has a chance to run
    expect(result.current).toBeTruthy()
    fireEvent.dragOver(result.current!)
    expect(handler).not.toHaveBeenCalled()
    expect(mockInitiateImportFromCsvFile).not.toHaveBeenCalled()
    fireEvent.drop(result.current!, { dataTransfer: mockDataTransferWithItems })
    expect(handler).not.toHaveBeenCalled()
    expect(mockInitiateImportFromCsvFile).toHaveBeenCalled()
    const file = mockInitiateImportFromCsvFile.mock.calls[0][0] as File
    expect(file.name).toBe(mockFilename)
  })

  it("ignores drops without DataTransfer items", () => {
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
