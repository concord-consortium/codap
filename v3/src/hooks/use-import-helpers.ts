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
import {
  getImportableFileTypeFromDataTransferFile, getImportableFileTypeFromFile, getImportableFileTypeFromUrl,
  ImportableFileType
} from "../utilities/importable-files"

const USE_IMPORTER_PLUGIN_FOR_CSV_FILE = true

// Maximum dimensions for initially-loaded images (in pixels)
const MAX_IMAGE_WIDTH = 800
const MAX_IMAGE_HEIGHT = 600

/**
 * Load an image from a URL and extract its natural dimensions.
 * Returns { width, height } scaled to fit within MAX dimensions while preserving aspect ratio.
 */
function getImageDimensions(imageUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let { naturalWidth: width, naturalHeight: height } = img

      // Scale down if image exceeds maximum dimensions while preserving aspect ratio
      if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
        const widthScale = MAX_IMAGE_WIDTH / width
        const heightScale = MAX_IMAGE_HEIGHT / height
        const scale = Math.min(widthScale, heightScale)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }

      resolve({ width, height })
    }
    img.onerror = () => {
      // If image fails to load, use default dimensions (half the max)
      resolve({ width: MAX_IMAGE_WIDTH / 2, height: MAX_IMAGE_HEIGHT / 2 })
    }
    img.src = imageUrl
  })
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
    let objectUrl: string | undefined

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
        objectUrl = file ? URL.createObjectURL(file) : undefined
        const imageUrl = objectUrl || url
        if (imageUrl) {
          getImageDimensions(imageUrl).then(({ width, height }) => {
            loadWebView(imageUrl, "image", { width, height: height + kTitleBarHeight })
          })
        }
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

  const handleDataTransferItem = useCallback(
    async function handleDataTransferItem(item: DataTransferItem) {
      let type: ImportableFileType | undefined
      let file: File | null = null
      let url: string | null = null

      if (item.kind === 'file') {
        file = item.getAsFile()
        type = getImportableFileTypeFromDataTransferFile(item)
      } else if (item.kind === 'string' && item.type === 'text/uri-list') {
        const urlPromise = new Promise<string>((resolve) => {
          item.getAsString((itemUrl) => resolve(itemUrl))
        })
        url = await urlPromise
        // pick di parameter if present
        url = (/di=(.+)/.exec(url))?.[1] || url
        type = getImportableFileTypeFromUrl(url)
      }

      if (file || url) {
        importFile(type, { file, url })
      }
  }, [importFile])

  return { handleDataTransferItem, handleFileImported,  handleUrlImported }
}
