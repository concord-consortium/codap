import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect } from "react"
import { CodapDndContext } from "../lib/dnd-kit/codap-dnd-context"
import { Container } from "./container/container"
import { ToolShelf } from "./tool-shelf/tool-shelf"
import { kCodapAppElementId } from "./constants"
import { importV2Document } from "../v2/import-v2-document"
import { MenuBar, kMenuBarElementId } from "./menu-bar/menu-bar"
import { useCloudFileManager } from "../lib/use-cloud-file-manager"
import { Logger } from "../lib/logger"
import { appState } from "../models/app-state"
import { addDefaultComponents } from "../models/codap/add-default-content"
import {gDataBroker} from "../models/data/data-broker"
import {IDataSet} from "../models/data/data-set"
import { dataContextCountChangedNotification } from "../models/data/data-set-notifications"
import { IDocumentModelSnapshot } from "../models/document/document"
import { IImportDataSetOptions } from "../models/document/document-content"
import { ISharedDataSet } from "../models/shared/shared-data-set"
import { getSharedModelManager } from "../models/tiles/tile-environment"
import { DocumentContentContext } from "../hooks/use-document-content"
import {useDropHandler} from "../hooks/use-drop-handler"
import { useKeyStates } from "../hooks/use-key-states"
import { registerTileTypes } from "../register-tile-types"
import { importSample, sampleData } from "../sample-data"
import { urlParams } from "../utilities/url-params"
import { kWebViewTileType } from "./web-view/web-view-defs"
import { isWebViewModel } from "./web-view/web-view-model"

import "../models/shared/shared-case-metadata-registration"
import "../models/shared/shared-data-set-registration"

import "./app.scss"

registerTileTypes([])

export const App = observer(function App() {
  useKeyStates()

  useCloudFileManager({
    appOrMenuElemId: kMenuBarElementId
  })

  const handleImportDataSet = useCallback(
    function handleImportDataSet(data: IDataSet, options?: IImportDataSetOptions) {
      let sharedData: ISharedDataSet | undefined
      appState.document.content?.applyModelChange(() => {
        sharedData = appState.document.content?.importDataSet(data, options)
      }, {
        notify: dataContextCountChangedNotification,
        undoStringKey: "V3.Undo.import.data",
        redoStringKey: "V3.Redo.import.data"
      })
      // return to "normal" after import process is complete
      sharedData?.dataSet.completeSnapshot()
    }, [])

  const handleImportV3Document = useCallback((document: IDocumentModelSnapshot) => {
    appState.setDocument(document)
  }, [])

  const handleUrlDrop = useCallback((url: string) => {
    const tile = appState.document.content?.createOrShowTile(kWebViewTileType)
    isWebViewModel(tile?.content) && tile?.content.setUrl(url)
  }, [])

  useDropHandler({
    selector: `#${kCodapAppElementId}`,
    onImportDataSet: handleImportDataSet,
    onImportV2Document: importV2Document,
    onImportV3Document: handleImportV3Document,
    onHandleUrlDrop: handleUrlDrop
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
            appState.document.content?.importDataSet(data, { createDefaultTile: !isDashboard })
          }
          catch (e) {
            console.warn(`Failed to import sample "${sample}"`)
          }
        }
        else if (isDashboard) {
          // we have to create a new starter data set only if none is imported to show the dashboard
          appState.document.content?.createStarterDataset()
        }
        if (isDashboard) {
          addDefaultComponents()
        }
      }

      const { di } = urlParams
      if (typeof di === "string") {
        // setTimeout ensures that other components have been rendered,
        // which is necessary to properly position the plugin.
        setTimeout(() => {
          appState.document.content?.applyModelChange(() => {
            const plugin = appState.document.content?.createTile?.(kWebViewTileType)
            if (isWebViewModel(plugin?.content)) plugin.content.setUrl(di)
          })
        })
      }

      appState.enableUndoRedoMonitoring()
      Logger.initializeLogger(appState.document)
    }

    initialize()
  }, [])

  return (
    <CodapDndContext>
      <DocumentContentContext.Provider value={appState.document.content}>
        <div className="codap-app" data-testid="codap-app">
          <MenuBar/>
          <ToolShelf document={appState.document}/>
          <Container/>
        </div>
      </DocumentContentContext.Provider>
    </CodapDndContext>
  )
})
