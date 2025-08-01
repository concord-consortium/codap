import { createCodapDocument } from "../models/codap/create-codap-document"
import { IFreeTileInRowOptions, isFreeTileRow } from "../models/document/free-tile-row"
import { getGlobalValueManager } from "../models/global/global-value-manager"
import { ISharedModel } from "../models/shared/shared-model"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { ITileContentModel } from "../models/tiles/tile-content"
import { getSharedModelManager } from "../models/tiles/tile-environment"
import { ITileModel, ITileModelSnapshotIn } from "../models/tiles/tile-model"
import { isV2ExternalContext } from "./codap-v2-data-context-types"
import { CodapV2DataSetImporter, getCaseDataFromV2ContextGuid } from "./codap-v2-data-set-importer"
import { CodapV2Document } from "./codap-v2-document"
import { GetCaseDataResult, importV2Component, LayoutTransformFn } from "./codap-v2-tile-importers"

export function importV2Document(v2Document: CodapV2Document) {
  // We do not migrate the v2 `appVersion` into the v3 `version` property.
  // That way if this converted document is saved, it will be saved with
  // the current CODAP version.
  const v3Document = createCodapDocument(undefined, { layout: "free" })
  const sharedModelManager = getSharedModelManager(v3Document)

  const documentMetadata = v2Document.getDocumentMetadata()
  if (documentMetadata) {
    const metadataEntries = Object.entries(documentMetadata)
    metadataEntries.forEach(([key, value]) => {
      if (value != null) {
        v3Document.setProperty(key, value)
      }
    })
  }

  // Note: it is not necessary to set the name when importing a v2 document
  // The CFM will get the name itself and then we'll set the name when
  // the v3 document is initialized

  // add shared models (data sets and case metadata)
  const dataSetImporter = new CodapV2DataSetImporter(v2Document.guidMap)
  v2Document.contexts.forEach(context => {
    if (!isV2ExternalContext(context)) {
      dataSetImporter.importContext(context, sharedModelManager)
    }
  })

  // This function will return the shared data set and case metadata for a given data context
  const getCaseData = (dataContextGuid: number): GetCaseDataResult => {
    return getCaseDataFromV2ContextGuid(dataContextGuid, sharedModelManager)
  }

  const getGlobalValues = () => getGlobalValueManager(sharedModelManager)

  const linkSharedModel = (tileContent: ITileContentModel, sharedModel?: ISharedModel, isProvider?: boolean) => {
    if (sharedModelManager && sharedModel) {
      sharedModelManager.addTileSharedModel(tileContent, sharedModel, isProvider)
    }
  }

  // add components
  const { content } = v3Document
  const row = content?.firstRow
  let maxZIndex = 0
  v2Document.components.forEach(v2Component => {
    const insertTile = (tile: ITileModelSnapshotIn, transform?: LayoutTransformFn) => {
      let newTile: ITileModel | undefined
      if (row && tile) {
        const info = getTileComponentInfo(tile.content.type)
        if (info) {
          const {
            layout: { left = 0, top = 0, width, height: v2Height, isVisible, zIndex, x, y }, savedHeight
          } = v2Component
          const isHidden = isVisible === false
          const v2Minimized = (!!savedHeight && v2Height != null && savedHeight >= v2Height) || undefined
          const isMinimized = v2Minimized && !isHidden
          const height = savedHeight && v2Minimized ? savedHeight : v2Height
          // only apply imported width and height to resizable tiles
          const _width = !info.isFixedWidth ? { width } : {}
          const _height = !info?.isFixedHeight ? { height } : {}
          const _zIndex = zIndex != null ? { zIndex } : {}
          if (zIndex != null && zIndex > maxZIndex) maxZIndex = zIndex
          const _layout: IFreeTileInRowOptions = {
            x: left ?? x, y: top ?? y, ..._width, ..._height, ..._zIndex, isHidden, isMinimized
          }
          const layout = transform?.(_layout) ?? _layout
          newTile = content?.insertTileSnapshotInRow(tile, row, layout)
        }
      }
      return newTile
    }
    importV2Component({ v2Component, v2Document, getCaseData, getGlobalValues, insertTile, linkSharedModel })
  })
  if (isFreeTileRow(row) && maxZIndex > 0) {
    row.setMaxZIndex(maxZIndex)
  }

  return v3Document
}
