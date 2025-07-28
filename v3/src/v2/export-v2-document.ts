import build from "../../build_number.json"
import pkg from "../../package.json"
import { convertDataSetToV2, IConvertDataSetToV2Options } from "../data-interactive/data-interactive-type-utils"
import { IDocumentModel } from "../models/document/document"
import { isFreeTileRow } from "../models/document/free-tile-row"
import { getSharedDataSets } from "../models/shared/shared-data-utils"
import { getSharedModelManager } from "../models/tiles/tile-environment"
import { getGlobalValueManager } from "../models/global/global-value-manager"
import { toV2Id } from "../utilities/codap-utils"
import { ICodapV2DataContext } from "./codap-v2-data-context-types"
import { exportV2Component, GameContextMetadataMap } from "./codap-v2-tile-exporters"
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
  const gameContextMetadataMap: GameContextMetadataMap = {}
  document.content?.tileMap.forEach(tile => {
    // components can add game context metadata, which will be used below when the contexts are exported
    const component = exportV2Component({ tile, row, sharedModelManager, gameContextMetadataMap })
    if (component) components.push(component)
  })

  // export the data contexts
  const contexts: ICodapV2DataContext[] = []
  getSharedDataSets(document).forEach(sharedData => {
    const _options: IConvertDataSetToV2Options = { exportCases: true, gameContextMetadataMap }
    const data = convertDataSetToV2(sharedData.dataSet, _options) as ICodapV2DataContext
    contexts.push(data)
  })

  // export the global values
  const globalValueManager = getGlobalValueManager(getSharedModelManager(document))
  const globalValues = Array.from(globalValueManager?.globals.values() ?? []).map(global => {
    return { guid: toV2Id(global.id), name: global.name, value: global.value }
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
    contexts,
    globalValues
  }
}
