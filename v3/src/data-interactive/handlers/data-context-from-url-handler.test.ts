import { appState } from "../../models/app-state"
import { kCaseTableTileType } from "../../components/case-table/case-table-defs"
import { gDataBroker } from "../../models/data/data-broker"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { CsvParseResult, downloadCsvFile } from "../../utilities/csv-import"
import { diDataContextFromURLHandler, getFilenameFromUrl } from "./data-context-from-url-handler"
import "../../components/case-table/case-table-registration"

jest.mock("../../utilities/csv-import", () => {
  const originalModule = jest.requireActual("../../utilities/csv-import")
  return {
    __esModule: true,
    ...originalModule,
    downloadCsvFile: jest.fn()
  }
})
const mockedDownloadCsvFile = downloadCsvFile as jest.MockedFunction<typeof downloadCsvFile>


describe("DataInteractive DataContextHandler", () => {
  const handler = diDataContextFromURLHandler

  const alertSpy = jest.spyOn(appState, "alert")
  alertSpy.mockReturnValue(undefined)

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("create", () => {
    it("handles invalid values", async () => {

      expect(await handler.create?.({})).toMatchObject({success: false})
      expect(await handler.create?.({}, 1)).toMatchObject({success: false})
      expect(await handler.create?.({}, ["hi"])).toMatchObject({success: false})
      expect(await handler.create?.({}, {fake: "value"})).toMatchObject({success: false})
    })

    it("handles onError from downloadCsvFile", async () => {
      mockedDownloadCsvFile.mockImplementation((url, onComplete, onError) => {
        onError({
            name: "",
            message: ""
        }, "")
      })

      const result = await handler.create!({}, {URL: "https://example.com"})
      expect(mockedDownloadCsvFile).toHaveBeenCalled()
      expect(result.success).toBe(false)
    })

    it("creates a dataset", async () => {
      gDataBroker.setSharedModelManager(getSharedModelManager(appState.document)!)

      mockedDownloadCsvFile.mockImplementation((url, onComplete, onError) => {
        const parseResult: CsvParseResult = {
            data: [{col1: "value1"}],
            errors: [],
            meta: {
                delimiter: "",
                linebreak: "",
                aborted: false,
                truncated: false,
                cursor: 0
            }
        }
        onComplete(parseResult, "")
      })

      expect(gDataBroker.length).toBe(0)
      const result = await handler.create!({}, {URL: "https://example.com/"})
      expect(gDataBroker.length).toBe(1)
      expect(mockedDownloadCsvFile).toHaveBeenCalled()
      expect(result.success).toBe(true)
      // There is also an id field, but that is harder to test.
      expect(result.values).toMatchObject({
        name: "https://example.com/"
      })
    })

    it("opens a case table for the imported dataset by default", async () => {
      gDataBroker.setSharedModelManager(getSharedModelManager(appState.document)!)
      const content = appState.document.content!
      const importSpy = jest.spyOn(content, "importDataSet")

      mockedDownloadCsvFile.mockImplementation((url, onComplete, onError) => {
        const parseResult: CsvParseResult = {
            data: [{col1: "value1"}],
            errors: [],
            meta: { delimiter: "", linebreak: "", aborted: false, truncated: false, cursor: 0 }
        }
        onComplete(parseResult, "")
      })

      const tablesBefore = content.getTilesOfType(kCaseTableTileType).length
      const result = await handler.create!({}, {URL: "https://example.com/nhanes.csv"})
      expect(result.success).toBe(true)
      expect(importSpy).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ createDefaultTile: true }))
      expect(content.getTilesOfType(kCaseTableTileType).length).toBe(tablesBefore + 1)
      importSpy.mockRestore()
    })

    it("imports the dataset without a case table when showCaseTable is false", async () => {
      gDataBroker.setSharedModelManager(getSharedModelManager(appState.document)!)
      const content = appState.document.content!
      const importSpy = jest.spyOn(content, "importDataSet")

      mockedDownloadCsvFile.mockImplementation((url, onComplete, onError) => {
        const parseResult: CsvParseResult = {
            data: [{col1: "value1"}],
            errors: [],
            meta: { delimiter: "", linebreak: "", aborted: false, truncated: false, cursor: 0 }
        }
        onComplete(parseResult, "")
      })

      const tablesBefore = content.getTilesOfType(kCaseTableTileType).length
      const result = await handler.create!({}, {URL: "https://example.com/mammals.csv", showCaseTable: false})
      expect(result.success).toBe(true)
      expect(importSpy).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ createDefaultTile: false }))
      expect(content.getTilesOfType(kCaseTableTileType).length).toBe(tablesBefore)
      importSpy.mockRestore()
    })

    it("applies a supplied title to the imported dataset", async () => {
      gDataBroker.setSharedModelManager(getSharedModelManager(appState.document)!)

      mockedDownloadCsvFile.mockImplementation((url, onComplete, onError) => {
        const parseResult: CsvParseResult = {
            data: [{col1: "value1"}],
            errors: [],
            meta: { delimiter: "", linebreak: "", aborted: false, truncated: false, cursor: 0 }
        }
        onComplete(parseResult, "")
      })

      const result = await handler.create!({}, {URL: "https://example.com/mammals.csv", title: "Mammals"})
      expect(result.success).toBe(true)
      expect(gDataBroker.last?.title).toBe("Mammals")
    })
  })
})

describe("getFilenameFromUrl", () => {
  it("handles regular urls", () => {
    expect(getFilenameFromUrl("https://example.com/myfile.txt")).toBe("myfile.txt")
    expect(getFilenameFromUrl("https://example.com/folder/myfile.txt")).toBe("myfile.txt")
  })

  it("handles files without extensions", () => {
    expect(getFilenameFromUrl("https://example.com/myfile")).toBe("myfile")
  })

  it("handles bare domains", () => {
    expect(getFilenameFromUrl("https://example.com")).toBe("")
  })

  it("handles folders", () => {
    expect(getFilenameFromUrl("https://example.com/myfolder/")).toBe("")
  })

  it("handles relative urls", () => {
    expect(getFilenameFromUrl("myfile.txt")).toBe("myfile.txt")
  })
})
