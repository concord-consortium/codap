import { clsx } from "clsx"
import { useDisclosure } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useMemo, useState } from "react"
// import { setLivelinessChecking } from "mobx-state-tree"
import { ErrorBoundary } from "react-error-boundary"
import { CfmContext } from "../hooks/use-cfm-context"
import { DocumentContentContext } from "../hooks/use-document-content"
import {useDropHandler} from "../hooks/use-drop-handler"
import { useKeyStates } from "../hooks/use-key-states"
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts"
import { useUncaughtErrorHandler } from "../hooks/use-uncaught-error-handler"
import { IUseCloudFileManagerHookOptions, useCloudFileManager } from "../lib/cfm/use-cloud-file-manager"
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
import { persistentState } from "../models/persistent-state"
import { registerTileTypes } from "../register-tile-types"
import { importSample, sampleData } from "../sample-data"
import { t } from "../utilities/translation/translate"
import { urlParams } from "../utilities/url-params"
import { kCodapAppElementId, kUserEntryDropOverlay } from "./constants"
import { Container } from "./container/container"
import { MenuBar, kMenuBarElementId } from "./menu-bar/menu-bar"
import { UserEntryModal } from "./menu-bar/user-entry-modal"
import { ToolShelf } from "./tool-shelf/tool-shelf"
import { kWebViewTileType } from "./web-view/web-view-defs"
import { isWebViewModel, IWebViewModel } from "./web-view/web-view-model"
import { initiateGenericImport, isGenericallyImportableUrl } from "../utilities/generic-import"
import { initiateImportFromCsv, isImportableCSVUrl } from "../utilities/csv-import"

import "../lib/debug-event-modification"
import "../models/shared/data-set-metadata-registration"
import "../models/shared/shared-data-set-registration"

import "./app.scss"

// Uncomment this to help track down MST errors like:
// "You are trying to read or write to an object that is no longer part of a state tree"
// See mst-detached-error.md for more information.
// setLivelinessChecking("error")

AttributeFormulaAdapter.register()
FilterFormulaAdapter.register()

// CODAP uses v2 cases and attributes in the notifications it sends to plugins
setDataSetNotificationAdapter(V2DataSetNotificationAdapter)

registerTileTypes([])

export const App = observer(function App() {
  useKeyStates()
  // default behavior is to show the user entry modal when CODAP is loaded
  // We close the modal if user imports, drags a document, opens a document
  // or plugin using url params
  const {isOpen: isOpenUserEntry, onOpen: onOpenUserEntry, onClose: onCloseUserEntry}
    = useDisclosure({defaultIsOpen: true})
  const [isDragOver, setIsDragOver] = useState(false)

  useKeyboardShortcuts()

  const handleFileOpened = useCallback(() => {
    onCloseUserEntry()
  }, [onCloseUserEntry])

  const handleLoadWebView = useCallback((url: string) => {
    const tile = appState.document.content?.createOrShowTile(kWebViewTileType)
    isWebViewModel(tile?.content) && tile?.content.setUrl(url)
  }, [])

  const handleUrlImported = useCallback((url: string) => {
    const importableCSVUrl = isImportableCSVUrl(url)
    const genericallyImportableUrl = isGenericallyImportableUrl(url)

    if (importableCSVUrl) {
      initiateImportFromCsv(importableCSVUrl)
    } else if (genericallyImportableUrl) {
      initiateGenericImport(genericallyImportableUrl)
    } else {
      handleLoadWebView(url)
    }
  }, [handleLoadWebView])

  const cfmOptions: IUseCloudFileManagerHookOptions = useMemo(() => ({
    onFileOpened: handleFileOpened,
    onUrlImported: handleUrlImported,
  }), [handleFileOpened, handleUrlImported])

  const { cfm, cfmReadyPromise } = useCloudFileManager(
    {appOrMenuElemId: kMenuBarElementId}, cfmOptions)

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
      onCloseUserEntry()
    }, [onCloseUserEntry])

  const handleImportDocument = useCallback((file: File) => {
    cfm?.client.openLocalFileWithConfirmation(file)
    onCloseUserEntry()
  }, [cfm, onCloseUserEntry])

  const handleUrlDrop = useCallback((url: string) => {
    handleLoadWebView(url)
    onCloseUserEntry()
  }, [onCloseUserEntry])

  useDropHandler({
    selector: isOpenUserEntry ? `#${kUserEntryDropOverlay}` : `#${kCodapAppElementId}`,
    onImportDataSet: handleImportDataSet,
    onImportDocument: handleImportDocument,
    onHandleUrlDrop: handleUrlDrop,
    onSetIsDragOver: setIsDragOver
  })

  useEffect(() => {
    // connect the data broker to the shared model manager
    if (!gDataBroker.sharedModelManager) {
      const sharedModelManager = getSharedModelManager(appState.document)
      sharedModelManager && gDataBroker.setSharedModelManager(sharedModelManager)
    }

    async function initialize() {
      const {sample, dashboard, di, noEntryModal} = urlParams
      const _sample = sampleData.find(name => sample === name.toLowerCase())
      const isDashboard = dashboard !== undefined
      const hideUserEntryModal = () => {
        return (sample || dashboard || di || noEntryModal !== undefined)
      }
      // create the initial sample data (if specified) or a new data set
      if (gDataBroker.dataSets.size === 0) {
        if (_sample) {
          try {
            const data = await importSample(_sample)
            const options: IImportDataSetOptions = {
              createDefaultTile: !isDashboard,
              width: isDashboard ? undefined : 1024 // default width for sample case table
            }
            appState.document.content?.importDataSet(data, options)
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

      if (hideUserEntryModal()) {
        onCloseUserEntry()
      }

      appState.enableDocumentMonitoring()
      Logger.initializeLogger(appState.document)

      window.onbeforeunload = function() {
        if (urlParams.suppressUnsavedWarning === undefined && cfm.client.state.dirty) {
          return t("V3.general.unsavedChangesWarning")
        }
      }
    }

    initialize()
  }, [cfm, cfmReadyPromise, onCloseUserEntry, onOpenUserEntry])

  const { fallbackRender } = useUncaughtErrorHandler(cfm)

  const toolbarContainerClassName =
    clsx("toolbar-container", { "vertical-toolbar-container": persistentState.toolbarPosition === "Left" })
  return (
    <CodapDndContext>
      <DocumentContentContext.Provider value={appState.document.content}>
        <CfmContext.Provider value={cfm}>
          <div className="codap-app" data-testid="codap-app">
            <MenuBar/>
            <ErrorBoundary fallbackRender={fallbackRender}>
              <div className={toolbarContainerClassName}>
                <ToolShelf document={appState.document}/>
                <Container/>
              </div>
            </ErrorBoundary>
          </div>
          {isOpenUserEntry &&
            <div id={`${kUserEntryDropOverlay}`}
              className={`${isOpenUserEntry && isDragOver ? "show-highlight" : ""}`}
            >
              <UserEntryModal
                isOpen={isOpenUserEntry}
                onClose={onCloseUserEntry}
              />
            </div>
          }
        </CfmContext.Provider>
      </DocumentContentContext.Provider>
    </CodapDndContext>
  )
})
