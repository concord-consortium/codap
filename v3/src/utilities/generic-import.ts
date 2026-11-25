import { kImporterPluginInsertOptions, kWebViewTileType } from "../components/web-view/web-view-defs"
import { IWebViewSnapshot } from "../components/web-view/web-view-model"
import { getImporterPluginUrl } from "../constants"
import { appState } from "../models/app-state"

type IGenericImportArgs = {file?: File|null, url?: string|null, contentType?: string }

export function getWebViewSnapshotState({file, url, contentType}: IGenericImportArgs): IWebViewSnapshot["state"] {
  const rawName = file ? file.name : url ? decodeURIComponent(url.trim().split("/").pop() ?? "") : undefined
  const datasetName = rawName && rawName.length > 0 ? rawName.split(".")[0].trim() : undefined
  const isGoogleSheets = contentType === "application/vnd.google-apps.spreadsheet"
  // Include showCaseTable and googleApiKey for Google Sheets (as per V2 API)
  const showCaseTable = isGoogleSheets ? true : undefined
  const googleApiKey = isGoogleSheets ? process.env.GOOGLE_SHEETS_API_KEY : undefined
  return { contentType, name: "Importer", datasetName, file, url, showCaseTable, googleApiKey }
}

// Opens the Importer plugin with the given state. As in V2, opening it isn't an undoable step.
export function insertImporterTile(state: IWebViewSnapshot["state"]) {
  const content = appState.document.content
  const webViewModelSnap: IWebViewSnapshot = {
    type: kWebViewTileType,
    subType: "plugin",
    url: getImporterPluginUrl(),
    state
  }
  content?.applyModelChange(() => {
    content.insertTileSnapshotInDefaultRow({
      _title: "Importer",
      content: webViewModelSnap
    }, kImporterPluginInsertOptions)
  })
}

export function initiateGenericImport(options: IGenericImportArgs) {
  insertImporterTile(getWebViewSnapshotState(options))
}
