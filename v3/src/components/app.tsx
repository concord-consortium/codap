import { observer } from "mobx-react-lite"
import { getSnapshot } from "mobx-state-tree"
import React, { useCallback, useEffect } from "react"
import { CodapDndContext } from "./codap-dnd-context"
import { ToolShelf } from "./tool-shelf/tool-shelf"
import {Container} from "./container"
import { MenuBar } from "./menu-bar/menu-bar"
import { appState } from "../models/app-state"
import { addDefaultComponents } from "../models/codap/add-default-content"
import { createCodapDocument, getTileEnvironment } from "../models/codap/create-codap-document"
import {gDataBroker} from "../models/data/data-broker"
import {DataSet, IDataSet, toCanonical} from "../models/data/data-set"
import { IDocumentModelSnapshot } from "../models/document/document"
import { ISharedModelDocumentManager } from "../models/document/shared-model-document-manager"
import { ITileModel } from "../models/tiles/tile-model"
import { DocumentContext } from "../hooks/use-document-context"
import {useDropHandler} from "../hooks/use-drop-handler"
import { useKeyStates } from "../hooks/use-key-states"
import { registerTileTypes } from "../register-tile-types"
import { importSample, sampleData } from "../sample-data"
import { urlParams } from "../utilities/url-params"
import { CodapV2Document } from "../v2/codap-v2-document"
import { importV2Component } from "../v2/codap-v2-tile-importers"
import "../models/shared/shared-case-metadata-registration"
import "../models/shared/shared-data-set-registration"

import "./app.scss"

registerTileTypes([])

addDefaultComponents()

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
    const v3Document = createCodapDocument(undefined, "free")
    const sharedModelManager = getTileEnvironment(v3Document)?.sharedModelManager
    sharedModelManager && gDataBroker.setSharedModelManager(sharedModelManager)
    // add data sets
    v2Document.datasets.forEach((data, key) => {
      const metadata = v2Document.metadata[key]
      gDataBroker.addDataAndMetadata(data, metadata)
    })

    // sort components
    const v2Components = v2Document.components.slice()
    // sort by zIndex so the resulting tiles will be ordered appropriately
    v2Components.sort((a, b) => (a.layout.zIndex ?? 0) - (b.layout.zIndex ?? 0))

    // add components
    const { content } = v3Document
    const row = content?.firstRow
    v2Components.forEach(v2Component => {
      const insertTile = (tile: ITileModel) => {
        if (row && tile) {
          const { left, top, width, height } = v2Component.layout
          content?.insertTileInRow(tile, row, { x: left, y: top, width, height })
        }
      }
      importV2Component({ v2Component, v2Document, sharedModelManager, insertTile })
    })

    // retrieve document snapshot
    gDataBroker.prepareSnapshots()
    const docSnapshot = getSnapshot(v3Document)
    gDataBroker.completeSnapshots()
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
    const newData = [{AttributeName: ""}]
    const ds = DataSet.create({name: "New Dataset"})
    ds.addAttribute({name: "AttributeName"})
    ds.addCases(toCanonical(ds, newData))
    gDataBroker.addDataSet(ds)
  }

  useEffect(() => {
    // connect the data broker to the shared model manager
    if (!gDataBroker.sharedModelManager) {
      const docEnv = getTileEnvironment(appState.document)
      const sharedModelManager = docEnv?.sharedModelManager as ISharedModelDocumentManager | undefined
      sharedModelManager && gDataBroker.setSharedModelManager(sharedModelManager)
    }

    // create the initial sample data (if specified) or a new data set
    if (gDataBroker.dataSets.size === 0) {
      const sample = sampleData.find(name => urlParams.sample === name)
      if (sample) {
        importSample(sample, handleImportDataSet)
      } else {
        createNewStarterDataset()
      }
    }
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
