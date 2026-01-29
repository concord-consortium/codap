import { kImporterPluginInsertOptions, kWebViewTileType } from "../components/web-view/web-view-defs"
import { IWebViewSnapshot } from "../components/web-view/web-view-model"
import { getImporterPluginUrl } from "../constants"
import { appState } from "../models/app-state"

type IGenericImportArgs = {file?: File|null, url?: string|null, contentType?: string }

export function getWebViewSnapshotState({file, url, contentType}: IGenericImportArgs): IWebViewSnapshot["state"] {
  const rawName = file ? file.name : url ? decodeURIComponent(url.trim().split("/").pop() ?? "") : undefined
  const datasetName = rawName && rawName.length > 0 ? rawName.split(".")[0].trim() : undefined
  const isGoogleSheets = contentType === "application/vnd.google-apps.spreadsheet"
  // Include showCaseTable and apiKey for Google Sheets (as per V2 API)
  const showCaseTable = isGoogleSheets ? true : undefined
  const apiKey = isGoogleSheets ? process.env.GOOGLE_SHEETS_API_KEY : undefined
  return { contentType, name: "Importer", datasetName, file, url, showCaseTable, apiKey }
}

export function initiateGenericImport(options: IGenericImportArgs) {
  const webViewModelSnap: IWebViewSnapshot = {
    type: kWebViewTileType,
    subType: "plugin",
    url: getImporterPluginUrl(),
    state: getWebViewSnapshotState(options)
  }
  appState.document.content?.insertTileSnapshotInDefaultRow({
    _title: "Importer",
    content: webViewModelSnap
  }, kImporterPluginInsertOptions)
}
