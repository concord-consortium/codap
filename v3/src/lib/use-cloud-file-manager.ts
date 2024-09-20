import { CFMAppOptions, CloudFileManagerClientEvent } from "@concord-consortium/cloud-file-manager"
import { getSnapshot } from "mobx-state-tree"
import { useEffect, useRef } from "react"
import { Root, createRoot } from "react-dom/client"
import { useMemo } from "use-memo-one"
import { clientConnect, createCloudFileManager, renderRoot } from "./cfm-utils"
import { handleCFMEvent } from "./handle-cfm-event"
import { appState } from "../models/app-state"
import { createCodapDocument, isCodapDocument } from "../models/codap/create-codap-document"
import { getDefaultLanguage, t } from "../utilities/translation/translate"
import { removeDevUrlParams } from "../utilities/url-params"

const locales = [
  {
    langName: 'Deutsch',
    langDigraph: 'de',
    countryDigraph: 'DE',
    icon: 'flag flag-de'
  },
  {
    langName: 'English',
    langDigraph: 'en',
    countryDigraph: 'US',
    icon: 'flag flag-us'
  },
  {
    langName: 'Español',
    langDigraph: 'es',
    countryDigraph: 'ES',
    icon: 'flag flag-es'
  },
  {
    langName: 'فارسی',
    langDigraph: 'fa',
    countryDigraph: 'IR',
    icon: 'flag flag-ir'
  },
  {
    langName: 'Ελληνικά',
    langDigraph: 'el',
    countryDigraph: 'GR',
    icon: 'flag flag-gr'
  },
  {
    langName: 'עברית',
    langDigraph: 'he',
    countryDigraph: 'IL',
    icon: 'flag flag-il'
  },
  {
    langName: '日本語',
    langDigraph: 'ja',
    countryDigraph: 'JP',
    icon: 'flag flag-jp'
  },
  {
    langName: '한국어',
    langDigraph: 'ko',
    countryDigraph: 'KO',
    icon: 'flag flag-kr'
  },
  {
    langName: 'Bokmål',
    langDigraph: 'nb',
    countryDigraph: 'NO',
    icon: 'flag flag-no'
  },
  {
    langName: 'Nynorsk',
    langDigraph: 'nn',
    countryDigraph: 'NO',
    icon: 'flag flag-no'
  },
  {
    langName: 'Polski',
    langDigraph: 'pl',
    countryDigraph: 'PL',
    icon: 'flag flag-pl'
  },
  {
    langName: 'Português do Brasil',
    langDigraph: 'pt-BR',
    countryDigraph: 'BR',
    icon: 'flag flag-br'
  },
  {
    langName: 'ไทย',
    langDigraph: 'th',
    countryDigraph: 'TH',
    icon: 'flag flag-th'
  },
  {
    langName: 'Türkçe',
    langDigraph: 'tr',
    countryDigraph: 'TR',
    icon: 'flag flag-tr'
  },
  {
    langName: '繁体中文',
    langDigraph: 'zh-TW',
    countryDigraph: 'TW',
    icon: 'flag flag-tw'
  },
  {
    langName: '简体中文',
    langDigraph: 'zh-Hans',
    countryDigraph: 'Hans',
    icon: 'flag flag-cn'
  }
]

export function useCloudFileManager(optionsArg: CFMAppOptions) {
  const options = useRef(optionsArg)
  const root = useRef<Root | undefined>()
  const cfm = useMemo(() => createCloudFileManager(), [])

  useEffect(function initCfm() {

    const _options: CFMAppOptions = {
      ui: {
        menuBar: {
          info: "Language menu",
          languageMenu: {
            currentLang: "en",
            options: locales.filter(locale => locale.langDigraph !== getDefaultLanguage())
                            .map(function (locale) {
                              return {
                                label: locale.langName,
                                langCode: locale.langDigraph,
                              }
                            }),
          },
          // onLangChanged: (langCode: string) => {
          //   Logger.log(`Changed language: ${langCode}`)
          // }
        },

        menu: [
          { name: t('DG.fileMenu.menuItem.newDocument'), action: 'newFileDialog' },
          { name: t('DG.fileMenu.menuItem.openDocument'), action: 'openFileDialog' },
          {
            name: t('DG.fileMenu.menuItem.closeDocument'),
            action() {
              cfm.client.closeFileDialog(function() {
                removeDevUrlParams()
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
          "src": "https://codap-resources.s3.amazonaws.com/example-documents/index.json",
          alphabetize: false
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

    // only enable Google Drive if configuration is available and origin is ssl or localhost
    if (process.env.GOOGLE_DRIVE_APP_ID &&
        (document.location.protocol === 'https:' ||
        document.location.hostname === 'localhost' ||
        document.location.hostname === '127.0.0.1')) {
      _options.providers?.splice(1, 0, {
        name: "googleDrive",
        mimeType: "application/json",
        clientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
        apiKey: process.env.GOOGLE_DRIVE_API_KEY,
        appId: process.env.GOOGLE_DRIVE_APP_ID
      })
    }

    cfm.init(_options)

    clientConnect(cfm, function cfmEventCallback(event: CloudFileManagerClientEvent) {
      handleCFMEvent(cfm.client, event)
    })

  }, [cfm])

  return cfm
}
