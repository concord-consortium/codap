import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect } from "react"
import { kCaseTableTileType } from "./case-table/case-table-defs"
import { CodapDndContext } from "./codap-dnd-context"
import { Container } from "./container/container"
import { createTileOfType } from "./create-tile"
import { ToolShelf } from "./tool-shelf/tool-shelf"
import { importV2Document } from "./import-v2-document"
import { MenuBar } from "./menu-bar/menu-bar"
import { appState } from "../models/app-state"
import { addDefaultComponents } from "../models/codap/add-default-content"
import {gDataBroker} from "../models/data/data-broker"
import {DataSet, IDataSet, toCanonical} from "../models/data/data-set"
import { IDocumentModelSnapshot } from "../models/document/document"
import { linkTileToDataSet } from "../models/shared/shared-data-utils"
import { getSharedModelManager } from "../models/tiles/tile-environment"
import { DocumentContext } from "../hooks/use-document-context"
import {useDropHandler} from "../hooks/use-drop-handler"
import { useKeyStates } from "../hooks/use-key-states"
import { registerTileTypes } from "../register-tile-types"
import { importSample, sampleData } from "../sample-data"
import { urlParams } from "../utilities/url-params"
import t from "../utilities/translation/translate"

import "../models/shared/shared-case-metadata-registration"
import "../models/shared/shared-data-set-registration"

import "./app.scss"

registerTileTypes([])

interface IImportDataSetOptions {
  createTableTile?: boolean // default true
}
export function handleImportDataSet(data: IDataSet, options?: IImportDataSetOptions) {
  // add data set
  const { sharedData } = gDataBroker.addDataSet(data)
  if (sharedData.dataSet && (options?.createTableTile !== false)) {
    // create the corresponding case table
    const newTile = createTileOfType(kCaseTableTileType, appState.document.content)
    if (newTile) {
      // link the case table to the new data set
      linkTileToDataSet(newTile.content, sharedData.dataSet)
    }
  }
}

export const App = observer(function App() {
  const codapDocument = appState.document

  useKeyStates()

  const handleImportV3Document = useCallback((document: IDocumentModelSnapshot) => {
    appState.setDocument(document)
  }, [])

  useDropHandler({
    selector: "#app",
    onImportDataSet: handleImportDataSet,
    onImportV2Document: importV2Document,
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
            // show case table if not showing a complete dashboard
            handleImportDataSet(data, { createTableTile: !isDashboard })
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
          <ToolShelf content={codapDocument.content} createTileOfType={createTileOfType}/>
          <Container content={codapDocument.content}/>
        </div>
      </DocumentContext.Provider>
    </CodapDndContext>
  )
})
