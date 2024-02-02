import { CFMAppOptions, CloudFileManagerClientEvent } from "@concord-consortium/cloud-file-manager"
import { getSnapshot } from "mobx-state-tree"
import { useEffect, useRef } from "react"
import { Root, createRoot } from "react-dom/client"
import { useMemo } from "use-memo-one"
import { clientConnect, createCloudFileManager, renderRoot } from "./cfm-utils"
import { handleCFMEvent } from "./handle-cfm-event"
import { appState } from "../models/app-state"
import { createCodapDocument, isCodapDocument } from "../models/codap/create-codap-document"
import t from "../utilities/translation/translate"

// eslint-disable-next-line import/no-unresolved
import envJsonUrl from "../../.env.json"

type Env = Record<string, string | Record<string, string>>

export function useCloudFileManager(optionsArg: CFMAppOptions) {
  const options = useRef(optionsArg)
  const root = useRef<Root | undefined>()
  const cfm = useMemo(() => createCloudFileManager(), [])

  useEffect(function initCfm() {

    async function getEnv() {
      let envJson: Env = {}

      try {
        const _env = await fetch(envJsonUrl as any)
        envJson = await _env.json()
      }
      catch (e) {
        console.error("Error retrieving environment!")
      }

      return envJson
    }

    const _options: CFMAppOptions = {
      ui: {
        // menuBar: {
        //   info: "Language menu",
        //   languageMenu: {
        //     currentLang: "EN-us",
        //     options: DG.locales.map(function (locale) {
        //       return {
        //         label: locale.langName,
        //         langCode: locale.langDigraph,
        //       };
        //     }),
        //     onLangChanged: function (langCode) {
        //       DG.log('Changed language: ' + langCode);
        //       window.location = makeNewLocaleUrl(langCode, window.location);
        //     }
        //   }
        // },
        menu: [
          { name: t('DG.fileMenu.menuItem.newDocument'), action: 'newFileDialog' },
          { name: t('DG.fileMenu.menuItem.openDocument'), action: 'openFileDialog' },
          {
            name: t('DG.fileMenu.menuItem.closeDocument'),
            action() {
              cfm.client.closeFileDialog(function() {
                appState.setDocument(getSnapshot(createCodapDocument()))
              })
            }
          },
          { name: t('DG.fileMenu.menuItem.importFile'), action: 'importDataDialog' },
          {
            name: t('DG.fileMenu.menuItem.revertTo'),
            items: [
              { name: t('DG.fileMenu.menuItem.revertToOpened'), action: 'revertToLastOpenedDialog'},
              { name: t('DG.fileMenu.menuItem.revertToShared'), action: 'revertToSharedDialog'}
            ]
          },
          'separator',
          { name: t('DG.fileMenu.menuItem.saveDocument'), action: 'saveFileAsDialog' },
          { name: t('DG.fileMenu.menuItem.copyDocument'), action: 'createCopy' },
          {
            name: t('DG.fileMenu.menuItem.share'),
            items: [
              { name: t('DG.fileMenu.menuItem.shareGetLink'), action: 'shareGetLink' },
              { name: t('DG.fileMenu.menuItem.shareUpdate'), action: 'shareUpdate' }
            ]
          },
          { name: t('DG.fileMenu.menuItem.renameDocument'), action: 'renameDialog' }
        ],
      },
      renderRoot(content: React.ReactNode, container: HTMLElement) {
        if (container && !root.current) {
          root.current = createRoot(container)
        }
        renderRoot(root.current, content)
      },
      appSetsWindowTitle: true, // CODAP takes responsibility for the window title
      wrapFileContent: false,
      isClientContent(content: unknown) {
        if (!content || typeof content !== "object") return false
        // presumed format of CODAP v2 document
        if ("metadata" in content && !!content.metadata) return true
        // presumed format of CODAP v3 document
        return isCodapDocument(content)
      },
      mimeType: 'application/json',
      readableMimeTypes: ['application/x-codap-document'],
      extension: "codap3",
      readableExtensions: ["json", "", "codap", "codap3"],
      enableLaraSharing: true,
      log(event, eventData) {
        // const params = eventData ? JSON.stringify(eventData) : ""
        // DG.logUser("%@: %@", event, params)
      },
      providers: [
        {
          "name": "readOnly",
          "displayName": t("DG.fileMenu.provider.examples.displayName"),
          "urlDisplayName": "examples",
          "src": "https://codap-server.concord.org/app/extn/example-documents/index.json.en",
          alphabetize: true
        },
        {
          "name": "lara",
          "patch": true,
          patchObjectHash(obj) {
            return obj.guid || JSON.stringify(obj)
          },
          logLaraData(obj) {
            // handleLogLaraData(obj)
          }
        },
        {
          "name": "documentStore",
          "displayName": "Concord Cloud",
          "deprecationPhase": 3,
          "patch": true,
          "patchObjectHash"(obj) {
            return obj.guid || JSON.stringify(obj)
          }
        },
        "localFile",
        //"localStorage"
      ],
      ...options.current
    }

    getEnv().then(env => {
      // only enable Google Drive if configuration is available and origin is ssl or localhost
      if (env?.gd && typeof env.gd === "object" &&
          (document.location.protocol === 'https:' ||
          document.location.hostname === 'localhost' ||
          document.location.hostname === '127.0.0.1')) {
        _options.providers?.splice(1, 0, {
          name: "googleDrive",
          mimeType: "application/json",
          ...env.gd
        })
      }

      cfm.init(_options)

      clientConnect(cfm, function cfmEventCallback(event: CloudFileManagerClientEvent) {
        return handleCFMEvent(cfm.client, event)
      })
    })

  }, [cfm])

  return cfm
}
