import { getEnv } from "mobx-state-tree"
import React, { useCallback, useEffect, useState } from "react"
import { CodapDndContext } from "./codap-dnd-context"
import { ToolShelf } from "./tool-shelf/tool-shelf"
import {Container} from "./container"
import { MenuBar } from "./menu-bar/menu-bar"
import {gDataBroker} from "../models/data/data-broker"
import {DataSet, IDataSet, toCanonical} from "../models/data/data-set"
import { addDefaultComponents, getCurrentDocument } from "../models/codap/create-codap-document"
import { ISharedModelDocumentManager } from "../models/document/shared-model-document-manager"
import { ITileEnvironment } from "../models/tiles/tile-content"
import {useDropHandler} from "../hooks/use-drop-handler"
import { useKeyStates } from "../hooks/use-key-states"
import { V2DocumentContext } from "../hooks/use-v2-document-context"
import { registerTileTypes } from "../register-tile-types"
import { importSample, sampleData } from "../sample-data"
import { urlParams } from "../utilities/url-params"
import { CodapV2Document } from "../v2/codap-v2-document"
import "../models/shared/shared-data-set-registration"

import "./app.scss"

registerTileTypes([])

addDefaultComponents()

export function handleImportDataSet(data: IDataSet) {
  // add data set
  gDataBroker.addDataSet(data)
}

export const App = () => {
  const codapDocument = getCurrentDocument()
  const [v2Document, setV2Document] = useState<CodapV2Document | undefined>()

  useKeyStates()

  const _handleImportDataSet = useCallback((data: IDataSet) => {
    handleImportDataSet(data)
    setV2Document(undefined)
  }, [])

  const handleImportDocument = useCallback((document: CodapV2Document) => {
    // add data sets
    document.datasets.forEach(data => gDataBroker.addDataSet(data))
    setV2Document(document)
  }, [])

  useDropHandler({
    selector: "#app",
    onImportDataSet: _handleImportDataSet,
    onImportDocument: handleImportDocument
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
      const docEnv: ITileEnvironment | undefined = getEnv(getCurrentDocument())
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
      <V2DocumentContext.Provider value={v2Document}>
        <div className="app" data-testid="app">
          <MenuBar/>
          <ToolShelf/>
          <Container content={codapDocument.content}/>
        </div>
      </V2DocumentContext.Provider>
    </CodapDndContext>
  )
}
