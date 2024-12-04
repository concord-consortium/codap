import build from "../../build_number.json"
import pkg from "../../package.json"
import { IDocumentModel } from "../models/document/document"
import { isFreeTileRow } from "../models/document/free-tile-row"
import { getSharedModelManager } from "../models/tiles/tile-environment"
import { exportV2Component } from "./codap-v2-tile-exporters"
import { CodapV2Component, ICodapV2DocumentJson } from "./codap-v2-types"

interface IV2DocumentExportOptions {
  filename?: string
}

export function exportV2Document(document: IDocumentModel, options?: IV2DocumentExportOptions): ICodapV2DocumentJson {
  const sharedModelManager = getSharedModelManager(document)
  const _row = document.content?.getRowByIndex(0)
  const row = isFreeTileRow(_row) ? _row : undefined

  // export the components
  const components: CodapV2Component[] = []
  document.content?.tileMap.forEach(tile => {
    const component = exportV2Component({ tile, row, sharedModelManager })
    if (component) components.push(component)
  })

  return {
    type: "DG.Document",
    id: 1,
    guid: 1,
    name: options?.filename || document.title,
    appName: "DG",
    appVersion: pkg.version,
    appBuildNum: `${build.buildNumber}`,
    metadata: {},
    components,
    contexts: [],
    globalValues: []
  }
}
