import { observer } from "mobx-react-lite"
import { getSnapshot } from "mobx-state-tree"
import React, { useCallback, useEffect } from "react"
import { CodapDndContext } from "./codap-dnd-context"
import { ToolShelf } from "./tool-shelf/tool-shelf"
import {Container} from "./container"
import { MenuBar } from "./menu-bar/menu-bar"
import { appState } from "../models/app-state"
import { addDefaultComponents } from "../models/codap/add-default-content"
import { createCodapDocument } from "../models/codap/create-codap-document"
import {gDataBroker} from "../models/data/data-broker"
import {DataSet, IDataSet, toCanonical} from "../models/data/data-set"
import { IDocumentModelSnapshot } from "../models/document/document"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { getSharedModelManager } from "../models/tiles/tile-environment"
import { ITileModel } from "../models/tiles/tile-model"
import { DocumentContext } from "../hooks/use-document-context"
import {useDropHandler} from "../hooks/use-drop-handler"
import { useKeyStates } from "../hooks/use-key-states"
import { registerTileTypes } from "../register-tile-types"
import { importSample, sampleData } from "../sample-data"
import { urlParams } from "../utilities/url-params"
import { CodapV2Document } from "../v2/codap-v2-document"
import { importV2Component } from "../v2/codap-v2-tile-importers"
import t from "../utilities/translation/translate"

import "../models/shared/shared-case-metadata-registration"
import "../models/shared/shared-data-set-registration"

import "./app.scss"

registerTileTypes([])

export function handleImportDataSet(data: IDataSet) {
  // add data set
  gDataBroker.addDataSet(data)
}

export const App = observer(function App() {
  const codapDocument = appState.document

  useKeyStates()

  const _handleImportDataSet = useCallback((data: IDataSet) => {
    handleImportDataSet(data)
  }, [])

  const handleImportV2Document = useCallback((v2Document: CodapV2Document) => {
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
    gDataBroker.prepareSnapshots()
    const docSnapshot = getSnapshot(v3Document)
    gDataBroker.completeSnapshots()
    // use document snapshot
    appState.setDocument(docSnapshot)
  }, [])

  const handleImportV3Document = useCallback((document: IDocumentModelSnapshot) => {
    appState.setDocument(document)
  }, [])

  useDropHandler({
    selector: "#app",
    onImportDataSet: _handleImportDataSet,
    onImportV2Document: handleImportV2Document,
    onImportV3Document: handleImportV3Document
  })

  function createNewStarterDataset() {
    const attributeName = t("DG.AppController.createDataSet.initialAttribute")
    const newData = [{[attributeName]: ""}]
    const ds = DataSet.create({ name: t("DG.AppController.createDataSet.name")})
    ds.addAttribute({ name: attributeName })
    ds.addCases(toCanonical(ds, newData))
    gDataBroker.addDataSet(ds)
  }

  useEffect(() => {
    // connect the data broker to the shared model manager
    if (!gDataBroker.sharedModelManager) {
      const sharedModelManager = getSharedModelManager(appState.document)
      sharedModelManager && gDataBroker.setSharedModelManager(sharedModelManager)
    }

    async function initialize() {
      // create the initial sample data (if specified) or a new data set
      if (gDataBroker.dataSets.size === 0) {
        const sample = sampleData.find(name => urlParams.sample === name.toLowerCase())
        const isDashboard = urlParams.dashboard !== undefined
        if (sample) {
          try {
            const data = await importSample(sample)
            handleImportDataSet(data)
          }
          catch (e) {
            console.warn(`Failed to import sample "${sample}"`)
          }
        }
        else if (isDashboard) {
          createNewStarterDataset()
        }
        // we have to create a new starter data set only if none is imported to show the dashboard
        if (isDashboard) {
          addDefaultComponents()
        }
      }
    }

    initialize()
  }, [])

  return (
    <CodapDndContext>
      <DocumentContext.Provider value={appState.document.content}>
        <div className="app" data-testid="app">
          <MenuBar/>
          <ToolShelf content={codapDocument.content}/>
          <Container content={codapDocument.content}/>
        </div>
      </DocumentContext.Provider>
    </CodapDndContext>
  )
})
