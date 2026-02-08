import { kImporterPluginInsertOptions, kWebViewTileType } from "../components/web-view/web-view-defs"
import { IWebViewSnapshot } from "../components/web-view/web-view-model"
import { getImporterPluginUrl } from "../constants"
import { appState } from "../models/app-state"
import { IDataSet } from "../models/data/data-set"

export function initiateImportFromHTML(html: string, data?: IDataSet) {
  const webViewModelSnap: IWebViewSnapshot = {
    type: kWebViewTileType,
    subType: "plugin",
    url: getImporterPluginUrl(),
    state: {
      contentType: "text/html",
      name: "Importer",
      text: html,
      targetDatasetName: data?.name
    }
  }
  appState.document.content?.insertTileSnapshotInDefaultRow({
    _title: "Importer",
    content: webViewModelSnap
  }, kImporterPluginInsertOptions)
}
