import { useDisclosure } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useState } from "react"
import { CfmContext } from "../hooks/use-cfm-context"
import { DocumentContentContext } from "../hooks/use-document-content"
import {useDropHandler} from "../hooks/use-drop-handler"
import { useKeyStates } from "../hooks/use-key-states"
import { useCloudFileManager } from "../lib/cfm/use-cloud-file-manager"
import { CodapDndContext } from "../lib/dnd-kit/codap-dnd-context"
import { logStringifiedObjectMessage } from "../lib/log-message"
import { Logger } from "../lib/logger"
import { appState } from "../models/app-state"
import { addDefaultComponents } from "../models/codap/add-default-content"
import {gDataBroker} from "../models/data/data-broker"
import {IDataSet} from "../models/data/data-set"
import { setDataSetNotificationAdapter } from "../models/data/data-set-notification-adapter"
import { V2DataSetNotificationAdapter } from "../models/data/data-set-notification-adapter-v2"
import { dataContextCountChangedNotification } from "../models/data/data-set-notifications"
import { IImportDataSetOptions } from "../models/document/document-content"
import { AttributeFormulaAdapter } from "../models/formula/attribute-formula-adapter"
import { FilterFormulaAdapter } from "../models/formula/filter-formula-adapter"
import { ISharedDataSet } from "../models/shared/shared-data-set"
import { getSharedModelManager } from "../models/tiles/tile-environment"
import { registerTileTypes } from "../register-tile-types"
import { importSample, sampleData } from "../sample-data"
import { urlParams } from "../utilities/url-params"
import { kCodapAppElementId, kUserEntryDropOverlay } from "./constants"
import { Container } from "./container/container"
import { MenuBar, kMenuBarElementId } from "./menu-bar/menu-bar"
import { UserEntryModal } from "./menu-bar/user-entry-modal"
import { ToolShelf } from "./tool-shelf/tool-shelf"
import { kWebViewTileType } from "./web-view/web-view-defs"
import { isWebViewModel, IWebViewModel } from "./web-view/web-view-model"

import "../lib/debug-event-modification"
import "../models/shared/data-set-metadata-registration"
import "../models/shared/shared-data-set-registration"

import "./app.scss"

AttributeFormulaAdapter.register()
FilterFormulaAdapter.register()

// CODAP uses v2 cases and attributes in the notifications it sends to plugins
setDataSetNotificationAdapter(V2DataSetNotificationAdapter)

registerTileTypes([])

export const App = observer(function App() {
  useKeyStates()
  // default behavior is to show the user enty modal when CODAP is loaded
  // We close the modal if user imports, drags a document, opens a document
  // or plugin using url params
  const {isOpen, onOpen, onClose} = useDisclosure()
  const [isDragOver, setIsDragOver] = useState(false)

  const { cfm, cfmReadyPromise } = useCloudFileManager({
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
        redoStringKey: "V3.Redo.import.data",
        log: logStringifiedObjectMessage("Imported data set: %@",
                  {datasetName: data.name}, "document")
      })
      // return to "normal" after import process is complete
      sharedData?.dataSet.completeSnapshot()
      onClose()
    }, [onClose])

  const handleImportDocument = useCallback((file: File) => {
    cfm?.client.openLocalFileWithConfirmation(file)
    onClose()
  }, [cfm, onClose])

  const handleUrlDrop = useCallback((url: string) => {
    const tile = appState.document.content?.createOrShowTile(kWebViewTileType)
    isWebViewModel(tile?.content) && tile?.content.setUrl(url)
    onClose()
  }, [onClose])

  useDropHandler({
    selector: isOpen ? `#${kUserEntryDropOverlay}` : `#${kCodapAppElementId}`,
    onImportDataSet: handleImportDataSet,
    onImportDocument: handleImportDocument,
    onHandleUrlDrop: handleUrlDrop,
    setIsDragOver
  })

  useEffect(() => {
    // connect the data broker to the shared model manager
    if (!gDataBroker.sharedModelManager) {
      const sharedModelManager = getSharedModelManager(appState.document)
      sharedModelManager && gDataBroker.setSharedModelManager(sharedModelManager)
    }

    async function initialize() {
      const {sample, dashboard, di, mouseSensor} = urlParams
      const _sample = sampleData.find(name => sample === name.toLowerCase())
      const isDashboard = dashboard !== undefined
      const hasHashFileParam = window.location.hash.startsWith("#file=examples:")

      const showUserEntryModal = () => {
        //include mouseSensor for testing
        return !(
          di || sample || dashboard || hasHashFileParam || mouseSensor !== undefined
        )
      }
      // create the initial sample data (if specified) or a new data set
      if (gDataBroker.dataSets.size === 0) {
        if (_sample) {
          try {
            const data = await importSample(_sample)
            appState.document.content?.importDataSet(data, { createDefaultTile: !isDashboard })
          }
          catch (e) {
            console.warn(`Failed to import sample "${_sample}"`)
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

      if (typeof di === "string") {
        // wait for CFM to complete its initialization
        await cfmReadyPromise

        const webviewTiles = appState.document.content?.getTilesOfType(kWebViewTileType)
        if (webviewTiles) {
          const webviews = webviewTiles.map(wV => wV.content) as IWebViewModel[]
          const plugins = webviews.filter(wV => wV.isPlugin)
          // if any of the plugins are already showing the specified data interactive,
          // don't create a new one
          if (plugins.length > 0 && plugins.some(pI => pI.url === di)) {
            return
          }
          //Do not show user entry modal
        }
        // setTimeout ensures that other components have been rendered,
        // which is necessary to properly position the plugin.
        setTimeout(() => {
          appState.document.content?.applyModelChange(() => {
            const plugin = appState.document.content?.createTile?.(kWebViewTileType)
            if (isWebViewModel(plugin?.content)) plugin.content.setUrl(di)
          })
        })
      }

      if (showUserEntryModal()) {
        onOpen()
      } else {
        onClose()
      }

      appState.enableDocumentMonitoring()
      Logger.initializeLogger(appState.document)
    }

    initialize()
  }, [cfmReadyPromise, onClose, onOpen])
  return (
    <CodapDndContext>
      <DocumentContentContext.Provider value={appState.document.content}>
        <CfmContext.Provider value={cfm}>
          <div className="codap-app" data-testid="codap-app">
            <MenuBar/>
            <ToolShelf document={appState.document}/>
            <Container/>
          </div>
          {isOpen &&
            <div id={`${kUserEntryDropOverlay}`} className={`${isOpen && isDragOver ? "show-highlight" : ""}`}>
            <UserEntryModal
              isOpen={isOpen}
              onClose={onClose}
            />
            </div>
          }
        </CfmContext.Provider>
      </DocumentContentContext.Provider>
    </CodapDndContext>
  )
})
