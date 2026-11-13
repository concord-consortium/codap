import { getClipboardImportFormat, importClipboardContent } from "./clipboard-import"

const mockInitiateImportFromCsv = jest.fn()
jest.mock("../../utilities/csv-import", () => ({
  initiateImportFromCsv: (...args: any[]) => mockInitiateImportFromCsv(...args)
}))

const mockInitiateImportFromHTML = jest.fn()
jest.mock("../../utilities/html-import", () => ({
  initiateImportFromHTML: (...args: any[]) => mockInitiateImportFromHTML(...args)
}))

describe("getClipboardImportFormat", () => {
  it("detects <table> with attributes and in upper case", () => {
    expect(getClipboardImportFormat({ html: '<table class="data"><tr><td>1</td></tr></table>' })).toBe("html")
    expect(getClipboardImportFormat({ html: "<TABLE><TR><TD>1</TD></TR></TABLE>" })).toBe("html")
  })

  it("treats non-table HTML with text as CSV", () => {
    expect(getClipboardImportFormat({ html: "<p>hello</p>", text: "hello" })).toBe("csv")
  })

  it("treats missing or whitespace-only text as empty", () => {
    expect(getClipboardImportFormat({})).toBeUndefined()
    expect(getClipboardImportFormat({ text: "  \n " })).toBeUndefined()
    expect(getClipboardImportFormat({ html: "<p></p>" })).toBeUndefined()
  })
})

describe("importClipboardContent", () => {
  beforeEach(() => {
    mockInitiateImportFromCsv.mockClear()
    mockInitiateImportFromHTML.mockClear()
  })

  it("routes an HTML table to the HTML importer", () => {
    const html = "<table><tr><td>1</td></tr></table>"
    expect(importClipboardContent({ html, text: "1" })).toBe("html")
    expect(mockInitiateImportFromHTML).toHaveBeenCalledWith(html, undefined)
    expect(mockInitiateImportFromCsv).not.toHaveBeenCalled()
  })

  it("passes an existing dataset to the HTML importer", () => {
    const html = "<table><tr><td>1</td></tr></table>"
    const mockDataSet = { name: "existing" } as any
    importClipboardContent({ html }, mockDataSet)
    expect(mockInitiateImportFromHTML).toHaveBeenCalledWith(html, mockDataSet)
  })

  it("routes non-table HTML to the CSV importer using the plain text", () => {
    expect(importClipboardContent({ html: "<p>hello</p>", text: "a,b\n1,2" })).toBe("csv")
    expect(mockInitiateImportFromHTML).not.toHaveBeenCalled()
    expect(mockInitiateImportFromCsv).toHaveBeenCalledWith({
      text: "a,b\n1,2", data: undefined, datasetName: "clipboard data"
    })
  })

  it("passes an existing dataset to the CSV importer without a dataset name", () => {
    const mockDataSet = { name: "existing" } as any
    importClipboardContent({ text: "a,b" }, mockDataSet)
    expect(mockInitiateImportFromCsv).toHaveBeenCalledWith({
      text: "a,b", data: mockDataSet, datasetName: undefined
    })
  })

  it("imports nothing when the content is empty", () => {
    expect(importClipboardContent({})).toBeUndefined()
    expect(importClipboardContent({ text: "  \n " })).toBeUndefined()
    expect(mockInitiateImportFromHTML).not.toHaveBeenCalled()
    expect(mockInitiateImportFromCsv).not.toHaveBeenCalled()
  })
})
