import { getSnapshot } from "mobx-state-tree"
import { appState } from "../models/app-state"
import { createCodapDocument } from "../models/codap/create-codap-document"
import { gDataBroker } from "../models/data/data-broker"
import { serializeDocument } from "../models/document/serialize-document"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { getSharedModelManager } from "../models/tiles/tile-environment"
import { ITileModel, ITileModelSnapshotIn } from "../models/tiles/tile-model"
import { CodapV2Document } from "./codap-v2-document"
import { importV2Component } from "./codap-v2-tile-importers"
import { IFreeTileInRowOptions, isFreeTileRow } from "../models/document/free-tile-row"

export async function importV2Document(v2Document: CodapV2Document) {
  const v3Document = createCodapDocument(undefined, { layout: "free" })
  const sharedModelManager = getSharedModelManager(v3Document)
  sharedModelManager && gDataBroker.setSharedModelManager(sharedModelManager)
  // add shared models (data sets and case metadata)
  v2Document.dataSets.forEach((data, key) => {
    const metadata = v2Document.metadata[key]
    gDataBroker.addDataAndMetadata(data, metadata)
  })

  // add components
  const { content } = v3Document
  const row = content?.firstRow
  let maxZIndex = 0
  v2Document.components.forEach(v2Component => {
    const insertTile = (tile: ITileModelSnapshotIn) => {
      let newTile: ITileModel | undefined
      if (row && tile) {
        const info = getTileComponentInfo(tile.content.type)
        if (info) {
          const { left = 0, top = 0, width, height, zIndex } = v2Component.layout
          // only apply imported width and height to resizable tiles
          const _width = !info.isFixedWidth ? { width } : {}
          const _height = !info?.isFixedHeight ? { height } : {}
          const _zIndex = zIndex != null ? { zIndex } : {}
          if (zIndex != null && zIndex > maxZIndex) maxZIndex = zIndex
          const layout: IFreeTileInRowOptions = { x: left, y: top, ..._width, ..._height, ..._zIndex }
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

  // retrieve document snapshot
  const docSnapshot = await serializeDocument(v3Document, doc => getSnapshot(doc))
  // use document snapshot
  appState.setDocument(docSnapshot)
}
