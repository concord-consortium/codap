import { initiateImportFromClipboard } from "./clipboard-import"

const mockInitiateImportFromCsv = jest.fn()
jest.mock("./csv-import", () => ({
  initiateImportFromCsv: (...args: any[]) => mockInitiateImportFromCsv(...args)
}))

const mockInitiateImportFromHTML = jest.fn()
jest.mock("./html-import", () => ({
  initiateImportFromHTML: (...args: any[]) => mockInitiateImportFromHTML(...args)
}))

describe("initiateImportFromClipboard", () => {
  beforeEach(() => {
    mockInitiateImportFromCsv.mockClear()
    mockInitiateImportFromHTML.mockClear()
  })

  function mockBlob(content: string) {
    return { text: () => Promise.resolve(content) }
  }

  function mockClipboardWithRead(htmlContent?: string, textContent?: string) {
    const items = [{
      types: htmlContent ? ["text/html", "text/plain"] : ["text/plain"],
      getType: jest.fn((type: string) => {
        if (type === "text/html" && htmlContent) {
          return Promise.resolve(mockBlob(htmlContent))
        }
        return Promise.resolve(mockBlob(textContent ?? ""))
      })
    }]
    Object.assign(navigator, {
      clipboard: {
        read: jest.fn().mockResolvedValue(items),
        readText: jest.fn().mockResolvedValue(textContent ?? "")
      }
    })
  }

  function mockClipboardWithoutRead(textContent: string) {
    Object.assign(navigator, {
      clipboard: {
        read: undefined,
        readText: jest.fn().mockResolvedValue(textContent)
      }
    })
  }

  it("routes HTML table to initiateImportFromHTML when read() is available", async () => {
    const html = "<table><tr><th>Name</th></tr><tr><td>Alice</td></tr></table>"
    mockClipboardWithRead(html, "Name\nAlice")
    await initiateImportFromClipboard()

    expect(mockInitiateImportFromHTML).toHaveBeenCalledTimes(1)
    expect(mockInitiateImportFromHTML).toHaveBeenCalledWith(html, undefined)
    expect(mockInitiateImportFromCsv).not.toHaveBeenCalled()
  })

  it("routes non-table HTML to CSV import", async () => {
    const html = "<p>just a paragraph</p>"
    mockClipboardWithRead(html, "just a paragraph")
    await initiateImportFromClipboard()

    expect(mockInitiateImportFromHTML).not.toHaveBeenCalled()
    expect(mockInitiateImportFromCsv).toHaveBeenCalledTimes(1)
    expect(mockInitiateImportFromCsv).toHaveBeenCalledWith({
      text: html,
      data: undefined,
      datasetName: "clipboard data"
    })
  })

  it("falls back to readText() when read() is not available", async () => {
    mockClipboardWithoutRead("Name,Age\nAlice,30")
    await initiateImportFromClipboard()

    expect(mockInitiateImportFromHTML).not.toHaveBeenCalled()
    expect(mockInitiateImportFromCsv).toHaveBeenCalledTimes(1)
    expect(mockInitiateImportFromCsv).toHaveBeenCalledWith({
      text: "Name,Age\nAlice,30",
      data: undefined,
      datasetName: "clipboard data"
    })
  })

  it("detects <table> with attributes", async () => {
    const html = '<table class="data"><tr><td>1</td></tr></table>'
    mockClipboardWithRead(html)
    await initiateImportFromClipboard()

    expect(mockInitiateImportFromHTML).toHaveBeenCalledTimes(1)
    expect(mockInitiateImportFromCsv).not.toHaveBeenCalled()
  })

  it("is case-insensitive for <TABLE> tags", async () => {
    const html = "<TABLE><TR><TD>1</TD></TR></TABLE>"
    mockClipboardWithRead(html)
    await initiateImportFromClipboard()

    expect(mockInitiateImportFromHTML).toHaveBeenCalledTimes(1)
    expect(mockInitiateImportFromCsv).not.toHaveBeenCalled()
  })

  it("passes existing dataset to CSV import path", async () => {
    mockClipboardWithRead(undefined, "Name,Age\nAlice,30")
    const mockDataSet = { name: "existing" } as any
    await initiateImportFromClipboard(mockDataSet)

    expect(mockInitiateImportFromCsv).toHaveBeenCalledWith({
      text: "Name,Age\nAlice,30",
      data: mockDataSet,
      datasetName: undefined
    })
  })

  it("passes existing dataset to HTML import path", async () => {
    const html = "<table><tr><th>Name</th></tr><tr><td>Alice</td></tr></table>"
    mockClipboardWithRead(html)
    const mockDataSet = { name: "existing" } as any
    await initiateImportFromClipboard(mockDataSet)

    expect(mockInitiateImportFromHTML).toHaveBeenCalledWith(html, mockDataSet)
    expect(mockInitiateImportFromCsv).not.toHaveBeenCalled()
  })
})
