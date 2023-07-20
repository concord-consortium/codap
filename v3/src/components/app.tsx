import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect } from "react"
import { CodapDndContext } from "./codap-dnd-context"
import { Container } from "./container/container"
import { ToolShelf } from "./tool-shelf/tool-shelf"
import { importV2Document } from "./import-v2-document"
import { MenuBar } from "./menu-bar/menu-bar"
import { appState } from "../models/app-state"
import { addDefaultComponents } from "../models/codap/add-default-content"
import {gDataBroker} from "../models/data/data-broker"
import {IDataSet} from "../models/data/data-set"
import { IDocumentModelSnapshot } from "../models/document/document"
import { IImportDataSetOptions } from "../models/document/document-content"
import { getSharedModelManager } from "../models/tiles/tile-environment"
import { DocumentContext } from "../hooks/use-document-context"
import {useDropHandler} from "../hooks/use-drop-handler"
import { useKeyStates } from "../hooks/use-key-states"
import { registerTileTypes } from "../register-tile-types"
import { importSample, sampleData } from "../sample-data"
import { urlParams } from "../utilities/url-params"

import "../models/shared/shared-case-metadata-registration"
import "../models/shared/shared-data-set-registration"

import "./app.scss"

registerTileTypes([])

export const App = observer(function App() {
  useKeyStates()

  const handleImportDataSet = useCallback(
    function handleImportDataSet(data: IDataSet, options?: IImportDataSetOptions) {
      appState.document.content?.importDataSet(data, options)
    }, [])

  const handleImportV3Document = useCallback((document: IDocumentModelSnapshot) => {
    appState.setDocument(document)
  }, [])

  useDropHandler({
    selector: "#app",
    onImportDataSet: handleImportDataSet,
    onImportV2Document: importV2Document,
    onImportV3Document: handleImportV3Document
  })

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
            // show case table if not showing a complete dashboard
            appState.document.content?.importDataSet(data, { createDefaultTile: !isDashboard })
          }
          catch (e) {
            console.warn(`Failed to import sample "${sample}"`)
          }
        }
        else if (isDashboard) {
          appState.document.content?.createStarterDataset()
        }
        // we have to create a new starter data set only if none is imported to show the dashboard
        if (isDashboard) {
          addDefaultComponents()
        }
      }
    }

    initialize()
  }, [])

  const documentContent = appState.document.content
  return (
    <CodapDndContext>
      <DocumentContext.Provider value={appState.document.content}>
        <div className="app" data-testid="app">
          <MenuBar/>
          <ToolShelf content={documentContent}/>
          <Container content={documentContent}/>
        </div>
      </DocumentContext.Provider>
    </CodapDndContext>
  )
})
