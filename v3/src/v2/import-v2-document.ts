import { createCodapDocument } from "../models/codap/create-codap-document"
import { gDataBroker } from "../models/data/data-broker"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { getSharedModelManager } from "../models/tiles/tile-environment"
import { ITileModel, ITileModelSnapshotIn } from "../models/tiles/tile-model"
import { CodapV2Document } from "./codap-v2-document"
import { importV2Component, LayoutTransformFn } from "./codap-v2-tile-importers"
import { IFreeTileInRowOptions, isFreeTileRow } from "../models/document/free-tile-row"

export function importV2Document(v2Document: CodapV2Document) {
  const v3Document = createCodapDocument(undefined, { layout: "free" })
  const sharedModelManager = getSharedModelManager(v3Document)
  sharedModelManager && gDataBroker.setSharedModelManager(sharedModelManager)

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
  v2Document.dataSets.forEach((data, key) => {
    const metadata = v2Document.caseMetadata[key]
    gDataBroker.addDataAndMetadata(data, metadata)
  })

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
    importV2Component({ v2Component, v2Document, sharedModelManager, insertTile })
  })
  if (isFreeTileRow(row) && maxZIndex > 0) {
    row.setMaxZIndex(maxZIndex)
  }

  return v3Document
}
