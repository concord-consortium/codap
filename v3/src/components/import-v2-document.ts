import { getSnapshot } from "mobx-state-tree"
import { appState } from "../models/app-state"
import { createCodapDocument } from "../models/codap/create-codap-document"
import { gDataBroker } from "../models/data/data-broker"
import { serializeDocument } from "../models/document/serialize-document"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { getSharedModelManager } from "../models/tiles/tile-environment"
import { ITileModel } from "../models/tiles/tile-model"
import { CodapV2Document } from "../v2/codap-v2-document"
import { importV2Component } from "../v2/codap-v2-tile-importers"

export function importV2Document(v2Document: CodapV2Document) {
  const v3Document = createCodapDocument(undefined, { layout: "free" })
  const sharedModelManager = getSharedModelManager(v3Document)
  sharedModelManager && gDataBroker.setSharedModelManager(sharedModelManager)
  // add shared models (data sets and case metadata)
  v2Document.datasets.forEach((data, key) => {
    const metadata = v2Document.metadata[key]
    gDataBroker.addDataAndMetadata(data, metadata)
  })

  // sort by zIndex so the resulting tiles will be ordered appropriately
  const v2Components = v2Document.components.slice()
  v2Components.sort((a, b) => (a.layout.zIndex ?? 0) - (b.layout.zIndex ?? 0))

  // add components
  const { content } = v3Document
  const row = content?.firstRow
  v2Components.forEach(v2Component => {
    const insertTile = (tile: ITileModel) => {
      if (row && tile) {
        const info = getTileComponentInfo(tile.content.type)
        if (info) {
          const { left, top, width, height } = v2Component.layout
          // only apply imported width and height to resizable tiles
          const _width = !info.isFixedWidth ? { width } : {}
          const _height = !info?.isFixedHeight ? { height } : {}
          content?.insertTileInRow(tile, row, { x: left, y: top, ..._width, ..._height })
        }
      }
    }
    importV2Component({ v2Component, v2Document, sharedModelManager, insertTile })
  })

  // retrieve document snapshot
  const docSnapshot = serializeDocument(v3Document, doc => getSnapshot(doc))
  // use document snapshot
  appState.setDocument(docSnapshot)
}
