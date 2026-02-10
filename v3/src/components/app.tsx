import { useDisclosure } from "@chakra-ui/react"
import { CloudFileManager } from "@concord-consortium/cloud-file-manager"
import { clsx } from "clsx"
import { autorun, reaction } from "mobx"
import { observer } from "mobx-react-lite"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { useMemo } from "use-memo-one"
// import { setLivelinessChecking } from "mobx-state-tree"
import { CfmContext } from "../hooks/use-cfm-context"
import { DocumentContentContext } from "../hooks/use-document-content"
import { useDropHandler } from "../hooks/use-drop-handler"
import { useImportHelpers } from "../hooks/use-import-helpers"
import { useKeyStates } from "../hooks/use-key-states"
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts"
import { ProgressContext, useProgressContextProviderValue } from "../hooks/use-progress"
import { useUncaughtErrorHandler } from "../hooks/use-uncaught-error-handler"
import { hideSplashScreen } from "../lib/cfm/splash-screen"
import { useEmbeddedMode } from "../lib/embedded-mode/use-embedded-mode"
import { IUseCloudFileManagerHookOptions, useCloudFileManager } from "../lib/cfm/use-cloud-file-manager"
import { CodapDndContext } from "../lib/dnd-kit/codap-dnd-context"
import { Logger } from "../lib/logger"
import { appState } from "../models/app-state"
import { addDefaultComponents } from "../models/codap/add-default-content"
import { gDataBroker } from "../models/data/data-broker"
import { setDataSetNotificationAdapter } from "../models/data/data-set-notification-adapter"
import { V2DataSetNotificationAdapter } from "../models/data/data-set-notification-adapter-v2"
import { IImportDataSetOptions } from "../models/document/document-content"
import { AttributeFormulaAdapter } from "../models/formula/attribute-formula-adapter"
import { FilterFormulaAdapter } from "../models/formula/filter-formula-adapter"
import { persistentState } from "../models/persistent-state"
import { getSharedModelManager } from "../models/tiles/tile-environment"
import { uiState } from "../models/ui-state"
import { registerTileTypes } from "../register-tile-types"
import { importSample, sampleData } from "../sample-data"
import { t } from "../utilities/translation/translate"
import { urlParams } from "../utilities/url-params"
import { isBeta } from "../utilities/version-utils"
import { BetaBanner } from "./beta/beta-banner"
import { If } from "./common/if"
import { kCodapAppElementId, kUserEntryDropOverlay } from "./constants"
import { Container } from "./container/container"
import { MenuBar, kMenuBarElementId } from "./menu-bar/menu-bar"
import { UserEntryModal } from "./menu-bar/user-entry-modal"
import { Progress } from "./progress"
import { ToolShelf } from "./tool-shelf/tool-shelf"
import { kWebViewTileType } from "./web-view/web-view-defs"
import { isWebViewModel, IWebViewModel } from "./web-view/web-view-model"

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
  useEmbeddedMode()
  // default behavior is to show the user entry modal when CODAP is loaded
  // We close the modal if user imports, drags a document, opens a document
  // or plugin using url params
  const {isOpen: isOpenUserEntry, onOpen: onOpenUserEntry, onClose: onCloseUserEntry}
    = useDisclosure({defaultIsOpen: true})
  const [isDragOver, setIsDragOver] = useState(false)
  const cfmRef = useRef<CloudFileManager | null>(null)

  useLayoutEffect(() => {
    return autorun(() => {
      if (uiState.hideSplashScreen) {
        hideSplashScreen()
      }
    })
  }, [])

  // Show/hide the splash screen for non-cursorMode busy indicator.
  // The splash screen is rendered outside of React (in index.html), so direct DOM manipulation is required.
  // Uses reaction (not autorun) so it doesn't fire on mount, which would hide the startup splash.
  useLayoutEffect(() => {
    return reaction(
      () => [uiState.isBusy, uiState.busyCursorMode] as const,
      ([isBusy, busyCursorMode]) => {
        const splash = document.getElementById("splash-screen")
        if (!splash) return
        if (isBusy && !busyCursorMode) {
          splash.style.display = ""
        } else {
          splash.style.display = "none"
        }
      }
    )
  }, [])

  const progressContextValue = useProgressContextProviderValue()

  useKeyboardShortcuts()

  const {
    handleDrop, handleFileImported, handleUrlImported
  } = useImportHelpers({ cfmRef, onCloseUserEntry })

  const handleFileOpened = useCallback(() => {
    onCloseUserEntry()
  }, [onCloseUserEntry])

  const cfmOptions: IUseCloudFileManagerHookOptions = useMemo(() => ({
    onFileOpened: handleFileOpened,
    onUrlImported: handleUrlImported,
    onFileImported: handleFileImported,
  }), [handleFileImported, handleFileOpened, handleUrlImported])

  const { cfm, cfmReadyPromise } = useCloudFileManager({appOrMenuElemId: kMenuBarElementId}, cfmOptions)

  // the handleUrlImported and handleFileImported callback are both options and users of the CFM
  // so we need to keep a ref to the CFM to avoid a circular dependency
  cfmRef.current = cfm

  useDropHandler({
    selector: isOpenUserEntry ? `#${kUserEntryDropOverlay}` : `#${kCodapAppElementId}`,
    onDrop: handleDrop,
    onSetIsDragOver: setIsDragOver
  })

  useEffect(() => {
    // connect the data broker to the shared model manager
    if (!gDataBroker.sharedModelManager) {
      const sharedModelManager = getSharedModelManager(appState.document)
      sharedModelManager && gDataBroker.setSharedModelManager(sharedModelManager)
    }

    async function initialize() {
      const {sample, dashboard, di, "di-override": diOverride} = urlParams
      const _sample = sampleData.find(name => sample === name.toLowerCase())
      const isDashboard = dashboard !== undefined
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

      if (typeof di === "string" && !diOverride) {
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

      if (uiState.hideUserEntryModal) {
        onCloseUserEntry()
      }

      appState.enableDocumentMonitoring()
      Logger.initializeLogger(appState.document)

      window.onbeforeunload = function() {
        if (!uiState.shouldSuppressUnsavedWarning && cfm.client.state.dirty) {
          return t("V3.general.unsavedChangesWarning")
        }
      }
    }

    initialize()
  }, [cfm, cfmReadyPromise, onCloseUserEntry, onOpenUserEntry])

  const { fallbackRender } = useUncaughtErrorHandler(cfm)

  const toolbarContainerClassName =
    clsx("toolbar-container", { "vertical-toolbar-container": persistentState.toolbarPosition === "Left" })
  const appClasses = clsx("codap-app", {
    "minimal-chrome": uiState.minimalChrome,
    "inbounds-mode": uiState.inboundsMode,
    beta: isBeta()
  })
  return (
    <CodapDndContext>
      <DocumentContentContext.Provider value={appState.document.content}>
        <CfmContext.Provider value={cfm}>
          <ProgressContext.Provider value={progressContextValue}>
            <If condition={isBeta() && uiState.shouldRenderBetaBanner}>
              <BetaBanner />
            </If>
            <div className={appClasses} data-testid="codap-app">
              <If condition={uiState.shouldRenderMenuBar}>
                <MenuBar/>
              </If>
              <ErrorBoundary fallbackRender={fallbackRender}>
                <div className={toolbarContainerClassName}>
                  <If condition={uiState.shouldRenderToolShelf}>
                    <ToolShelf document={appState.document}/>
                  </If>
                  <Container/>
                </div>
              </ErrorBoundary>
              <If condition={uiState.isBusy && uiState.busyCursorMode}>
                <div className="busy-overlay" />
              </If>
            </div>
            <If condition={isOpenUserEntry}>
              <div id={`${kUserEntryDropOverlay}`}
                className={clsx({ "show-highlight": isOpenUserEntry && isDragOver, beta: isBeta() })}
              >
                <UserEntryModal
                  isOpen={isOpenUserEntry}
                  onClose={onCloseUserEntry}
                />
              </div>
            </If>
            <Progress />
          </ProgressContext.Provider>
        </CfmContext.Provider>
      </DocumentContentContext.Provider>
    </CodapDndContext>
  )
})
