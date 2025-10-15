import { kWebViewTileType } from "../components/web-view/web-view-defs"
import { IWebViewSnapshot } from "../components/web-view/web-view-model"
import { getImporterPluginUrl } from "../constants"
import { appState } from "../models/app-state"
import { getExtensionFromUrl } from "./urls"

interface IGenericImportFileArgs {
  file: File
}
interface IGenericImportUrlArgs {
  url: string
}
type IGenericImportArgs = (IGenericImportFileArgs | IGenericImportUrlArgs) & { contentType?: string }

export const kGenericallyImportableUrlTypes: Record<string, string> = {
  geojson: "application/geo+json",
}

export function isGenericallyImportableUrl(url: string): false | { url: string, contentType: string } {
  for (const [extension, contentType] of Object.entries(kGenericallyImportableUrlTypes)) {
    if (getExtensionFromUrl(url) === extension) {
      return { url, contentType }
    }
  }
  return false
}

export function getWebViewSnapshotState(options: IGenericImportArgs): IWebViewSnapshot["state"] {
  const file = "file" in options ? options.file : undefined
  const url = "url" in options ? options.url : undefined
  const rawName = file ? file.name : url ? decodeURIComponent(url.trim().split("/").pop() ?? "") : undefined
  const datasetName = rawName && rawName.length > 0 ? rawName.split(".")[0].trim() : undefined

  return {
    contentType: options.contentType,
    name: "Importer",
    datasetName,
    file,
    url,
  }
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
  })
}
