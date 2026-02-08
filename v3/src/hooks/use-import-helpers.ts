import { CloudFileManager } from "@concord-consortium/cloud-file-manager"
import { useCallback } from "react"
import { kTitleBarHeight } from "../components/constants"
import { kWebViewTileType, WebViewSubType } from "../components/web-view/web-view-defs"
import { isWebViewModel } from "../components/web-view/web-view-model"
import { IImportedFile } from "../lib/cfm/use-cloud-file-manager"
import { logStringifiedObjectMessage } from "../lib/log-message"
import { appState } from "../models/app-state"
import { INewTileOptions } from "../models/codap/create-tile"
import { IDataSet } from "../models/data/data-set"
import { dataContextCountChangedNotification } from "../models/data/data-set-notifications"
import { IImportDataSetOptions } from "../models/document/document-content"
import { ISharedDataSet } from "../models/shared/shared-data-set"
import {
  convertParsedCsvToDataSet, CsvParseResult, importCsvFile, initiateImportFromCsv
} from "../utilities/csv-import"
import { initiateGenericImport } from "../utilities/generic-import"
import { initiateImportFromHTML } from "../utilities/html-import"
import { downscaleImageFile, getImageDimensions } from "../utilities/image-utils"
import {
  getImportableFileTypeFromDataTransferFile, getImportableFileTypeFromFile, getImportableFileTypeFromUrl,
  ImportableFileType, stripExtensionFromFilename
} from "../utilities/importable-files"

const USE_IMPORTER_PLUGIN_FOR_CSV_FILE = true

export type DropPriority = "files" | "url" | "html" | "none"

// Determines the highest-priority drop type from the available DataTransfer items,
// replicating V2's priority order: files > URLs > HTML tables.
export function getDropPriority(items: DataTransferItemList): DropPriority {
  let hasFile = false
  let hasUrl = false
  let hasHtml = false
  for (let i = 0; i < items.length; i++) {
    if (items[i].kind === "file") hasFile = true
    if (items[i].kind === "string" && items[i].type === "text/uri-list") hasUrl = true
    if (items[i].kind === "string" && items[i].type === "text/html") hasHtml = true
  }
  if (hasFile) return "files"
  if (hasUrl) return "url"
  if (hasHtml) return "html"
  return "none"
}

interface IProps {
  cfmRef: React.MutableRefObject<CloudFileManager | null>
  onCloseUserEntry: () => void
}

export function useImportHelpers({ cfmRef, onCloseUserEntry }: IProps) {
  const loadWebView = useCallback((url: string, subType?: WebViewSubType, tileOptions?: INewTileOptions) => {
    const tile = appState.document.content?.createOrShowTile(kWebViewTileType, tileOptions)
    if (isWebViewModel(tile?.content)) {
      subType && tile.content.setSubType(subType)
      tile.content.setUrl(url)
    }
  }, [])

  const importDataSet = useCallback(
    function importDataSet(data: IDataSet, options?: IImportDataSetOptions) {
      let sharedData: ISharedDataSet | undefined
      appState.document.content?.applyModelChange(() => {
        sharedData = appState.document.content?.importDataSet(data, options)
      }, {
        notify: dataContextCountChangedNotification,
        undoStringKey: "V3.Undo.import.data",
        redoStringKey: "V3.Redo.import.data",
        log: logStringifiedObjectMessage("Imported data set: %@",
                  {datasetName: data.name}, "document")
      })
      // return to "normal" after import process is complete
      sharedData?.dataSet.completeSnapshot()
      onCloseUserEntry()
  }, [onCloseUserEntry])

  const importFile = useCallback((type?: ImportableFileType, options?: {file?: File|null, url?: string|null}) => {
    const {file, url} = options || {}

    switch (type) {
      case "codap":
        if (file) {
          cfmRef.current?.client.openLocalFileWithConfirmation(file)
        } else if (url) {
          loadWebView(url)
        }
        break
      case "csv":
        if (file) {
          if (USE_IMPORTER_PLUGIN_FOR_CSV_FILE) {
            // For .csv import via Importer plugin
            initiateImportFromCsv({ file })
          }
          else {
            // For local .csv import without Importer plugin
            importCsvFile(file, (results: CsvParseResult, aFile: any) => {
              const ds = convertParsedCsvToDataSet(results, aFile.name)
              importDataSet(ds)
            })
          }
        } else if (url) {
          initiateImportFromCsv({ url })
        }
        break
      case "geojson":
        initiateGenericImport({ file, url, contentType: "application/geo+json" })
        break
      case "google-sheets":
        // no file option for Google Sheets
        initiateGenericImport({ url, contentType: "application/vnd.google-apps.spreadsheet" })
        break
      case "image": {
        // Convert file to data URL if provided, otherwise use the URL directly
        // Downscale large images to 512px max dimension to prevent data URL bloat
        const imageUrlPromise = file ? downscaleImageFile(file) : Promise.resolve(url)
        // Use filename as title for dropped files, removing the extension
        const imageTitle = file?.name ? stripExtensionFromFilename(file.name) : undefined
        imageUrlPromise.then(imageUrl => {
          if (imageUrl) {
            getImageDimensions(imageUrl).then(({ width, height }) => {
              loadWebView(imageUrl, "image", { width, height: height + kTitleBarHeight, title: imageTitle })
            })
          }
        }).catch(error => {
          console.error("Failed to process image:", error)
        })
        break
      }
      default:
        if (file) {
          cfmRef.current?.client.alert("Sorry, this type of file cannot be imported into CODAP", "Drop File")
        } else if (url) {
          loadWebView(url)
        }
        break
    }
    onCloseUserEntry()
  }, [cfmRef, importDataSet, loadWebView, onCloseUserEntry])

  const handleUrlImported = useCallback((url: string) => {
    importFile(getImportableFileTypeFromUrl(url), { url })
  }, [importFile])

  const handleFileImported = useCallback((file: IImportedFile) => {
    importFile(getImportableFileTypeFromFile(file), { file: file.object })
  }, [importFile])

  // Replicates V2's priority order for drop handling (files > URLs > HTML tables).
  // This ensures that URL drops (which may include text/html items) don't trigger
  // the HTML table importer. Uses synchronous getData() to extract string data so
  // that drop handler cleanup doesn't race with async callbacks.
  const handleDrop = useCallback(
    function handleDrop(event: DragEvent) {
      const dataTransfer = event.dataTransfer
      if (!dataTransfer?.items) return

      const priority = getDropPriority(dataTransfer.items)

      switch (priority) {
        case "files":
          for (let i = 0; i < dataTransfer.items.length; i++) {
            if (dataTransfer.items[i].kind === "file") {
              const file = dataTransfer.items[i].getAsFile()
              const type = getImportableFileTypeFromDataTransferFile(dataTransfer.items[i])
              if (file) {
                importFile(type, { file })
              }
            }
          }
          break
        case "url": {
          // Per RFC 2483, text/uri-list may contain multiple lines and # comment lines
          const rawUri = dataTransfer.getData("text/uri-list")
          const url = rawUri.split(/\r?\n/).map(l => l.trim()).find(l => l && !l.startsWith("#"))
          if (url) {
            // pick di parameter if present
            const importUrl = (/di=(.+)/.exec(url))?.[1] || url
            const type = getImportableFileTypeFromUrl(importUrl)
            importFile(type, { url: importUrl })
          }
          break
        }
        case "html": {
          const html = dataTransfer.getData("text/html")
          if (html) {
            initiateImportFromHTML(html)
          }
          break
        }
      }
  }, [importFile])

  return { handleDrop, handleFileImported,  handleUrlImported }
}
