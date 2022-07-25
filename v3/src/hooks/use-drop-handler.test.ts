import { fireEvent } from "@testing-library/react"
import { renderHook } from "@testing-library/react-hooks"
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
        getAsFile: () => ({})
      }
    }
  }

  const mockDataTransferWithoutItems: any = {
    clearData: () => null
  }

  it("ignores drops with invalid selector", () => {
    const handler = jest.fn()
    const { rerender, result } = renderHook(() => useDropHandler("foo", handler))
    rerender()  // make sure effect has a chance to run
    expect(result.current).toBeFalsy()
  })

  it("ignores drops without DataTransfer", () => {
    const handler = jest.fn()
    const { rerender, result } = renderHook(() => useDropHandler("body", handler))
    rerender()  // make sure effect has a chance to run
    expect(result.current).toBeTruthy()
    fireEvent.dragOver(result.current!)
    expect(handler).not.toHaveBeenCalled()
    fireEvent.drop(result.current!)
    expect(handler).not.toHaveBeenCalled()
  })

  it("handles drops with items", () => {
    const handler = jest.fn()
    const { rerender, result } = renderHook(() => useDropHandler("body", handler))
    rerender()  // make sure effect has a chance to run
    expect(result.current).toBeTruthy()
    fireEvent.dragOver(result.current!)
    expect(handler).not.toHaveBeenCalled()
    fireEvent.drop(result.current!, { dataTransfer: mockDataTransferWithItems })
    expect(handler).toHaveBeenCalled()
    expect(handler.mock.calls[0]).toEqual([mockData, mockFilename])
  })

  it("ignores drops without items", () => {
    const handler = jest.fn()
    const { rerender, result } = renderHook(() => useDropHandler("body", handler))
    rerender()  // make sure effect has a chance to run
    expect(result.current).toBeTruthy()
    fireEvent.dragOver(result.current!)
    expect(handler).not.toHaveBeenCalled()
    fireEvent.drop(result.current!, { dataTransfer: mockDataTransferWithoutItems })
    expect(handler).not.toHaveBeenCalled()
  })
})
