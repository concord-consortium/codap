import { CFMAppOptions, CloudFileManager, CloudFileManagerClientEvent } from "@concord-consortium/cloud-file-manager"
import { useEffect, useRef } from "react"
import { Root, createRoot } from "react-dom/client"
import { useMemo } from "use-memo-one"
import { codapResourcesUrl } from "../../constants"
import { appState } from "../../models/app-state"
import { isCodapDocument } from "../../models/codap/create-codap-document"
import { gLocale } from "../../utilities/translation/locale"
import { t } from "../../utilities/translation/translate"
import { removeDevUrlParams, urlParams } from "../../utilities/url-params"
import { clientConnect, createCloudFileManager, renderRoot } from "./cfm-utils"
import { CONFIG_SAVE_AS_V2 } from "../config"
import { DEBUG_CFM_LOCAL_STORAGE, DEBUG_CFM_NO_AUTO_SAVE, DEBUG_SAVE_AS_V2 } from "../debug"
import { handleCFMEvent } from "./handle-cfm-event"
import CODAPIcon from "../../assets/cfm/codap-logo.nosvgr.svg"
import LanguageMenuIcon from "../../assets/cfm/language-menu-icon.nosvgr.svg"
import FileMenuIcon from "../../assets/cfm/file-menu-icon.nosvgr.svg"
import FileCloseIcon from "../../assets/cfm/file-close-icon.nosvgr.svg"
import FileGetLinkToSharedViewIcon from "../../assets/cfm/file-get-link-to-shared-view-icon.nosvgr.svg"
import FileImportIcon from "../../assets/cfm/file-import-icon.nosvgr.svg"
import FileMakeACopyIcon from "../../assets/cfm/file-make-a-copy-icon.nosvgr.svg"
import FileNewIcon from "../../assets/cfm/file-new-icon.nosvgr.svg"
import FileOpenIcon from "../../assets/cfm/file-open-icon.nosvgr.svg"
import FileRecentlyOpenedStateIcon from "../../assets/cfm/file-recently-opened-state-icon.nosvgr.svg"
import FileRenameIcon from "../../assets/cfm/file-rename-icon.nosvgr.svg"
import FileRevertIcon from "../../assets/cfm/file-revert-icon.nosvgr.svg"
import FileSaveIcon from "../../assets/cfm/file-save-icon.nosvgr.svg"
import FileShareIcon from "../../assets/cfm/file-share-icon.nosvgr.svg"
import FileSharedViewIcon from "../../assets/cfm/file-shared-view-icon.nosvgr.svg"
import FileUpdateSharedViewIcon from "../../assets/cfm/file-update-shared-view-icon.nosvgr.svg"
import SubMenuExpandIcon from "../../assets/cfm/dropdown-arrow-old.nosvgr.svg"

const locales = [
  {
    langName: 'Deutsch',
    langCode: 'de',
    countryDigraph: 'DE',
    icon: 'flag flag-de'
  },
  {
    langName: 'English',
    langCode: 'en-US',
    countryDigraph: 'US',
    icon: 'flag flag-us'
  },
  {
    langName: 'Español',
    langCode: 'es',
    countryDigraph: 'ES',
    icon: 'flag flag-es'
  },
  {
    langName: 'فارسی',
    langCode: 'fa',
    countryDigraph: 'IR',
    icon: 'flag flag-ir'
  },
  {
    langName: 'Ελληνικά',
    langCode: 'el',
    countryDigraph: 'GR',
    icon: 'flag flag-gr'
  },
  {
    langName: 'עברית',
    langCode: 'he',
    countryDigraph: 'IL',
    icon: 'flag flag-il'
  },
  {
    langName: '日本語',
    langCode: 'ja',
    countryDigraph: 'JP',
    icon: 'flag flag-jp'
  },
  {
    langName: '한국어',
    langCode: 'ko',
    countryDigraph: 'KO',
    icon: 'flag flag-kr'
  },
  {
    langName: 'Bokmål',
    langCode: 'nb',
    countryDigraph: 'NO',
    icon: 'flag flag-no'
  },
  {
    langName: 'Nynorsk',
    langCode: 'nn',
    countryDigraph: 'NO',
    icon: 'flag flag-no'
  },
  {
    langName: 'Português do Brasil',
    langCode: 'pt-BR',
    countryDigraph: 'BR',
    icon: 'flag flag-br'
  },
  {
    langName: 'ไทย',
    langCode: 'th',
    countryDigraph: 'TH',
    icon: 'flag flag-th'
  },
  {
    langName: 'Türkçe',
    langCode: 'tr',
    countryDigraph: 'TR',
    icon: 'flag flag-tr'
  },
  {
    langName: '简体中文',
    langCode: 'zh-Hans',
    countryDigraph: 'Hans',
    icon: 'flag flag-cn'
  },
  {
    langName: '繁体中文',
    langCode: 'zh-TW',
    countryDigraph: 'TW',
    icon: 'flag flag-tw'
  }
]

function getMenuConfig(cfm: CloudFileManager) {
  return [
    { name: t('DG.fileMenu.menuItem.newDocument'), action: 'newFileDialog', icon: FileNewIcon },
    { name: t('DG.fileMenu.menuItem.openDocument'), action: 'openFileDialog', icon: FileOpenIcon },
    {
      name: t('DG.fileMenu.menuItem.closeDocument'),
      action() {
        cfm.client.closeFileDialog(function() {
          removeDevUrlParams()
          appState.setDocument({type: "CODAP"})
        })
      },
      icon: FileCloseIcon
    },
    { name: t('DG.fileMenu.menuItem.importFile'), action: 'importDataDialog', icon: FileImportIcon },
    {
      name: t('DG.fileMenu.menuItem.revertTo'), icon: FileRevertIcon,
      items: [
        { name: t('DG.fileMenu.menuItem.revertToOpened'), action: 'revertToLastOpenedDialog',
          icon: FileRecentlyOpenedStateIcon },
        { name: t('DG.fileMenu.menuItem.revertToShared'), action: 'revertToSharedDialog', icon: FileSharedViewIcon }
      ]
    },
    'separator',
    { name: t('DG.fileMenu.menuItem.saveDocument'), action: 'saveFileAsDialog', icon: FileSaveIcon },
    { name: t('DG.fileMenu.menuItem.copyDocument'), action: 'createCopy', icon: FileMakeACopyIcon },
    {
      name: t('DG.fileMenu.menuItem.share'), icon: FileShareIcon,
      items: [
        { name: t('DG.fileMenu.menuItem.shareGetLink'), action: 'shareGetLink', icon: FileGetLinkToSharedViewIcon },
        { name: t('DG.fileMenu.menuItem.shareUpdate'), action: 'shareUpdate', icon: FileUpdateSharedViewIcon },
      ]
    },
    { name: t('DG.fileMenu.menuItem.renameDocument'), action: 'renameDialog', icon: FileRenameIcon }
  ]
}

export function useCloudFileManager(optionsArg: CFMAppOptions, onFileOpened?: () => void) {
  const options = useRef(optionsArg)
  const root = useRef<Root | undefined>()
  const cfm = useMemo(() => createCloudFileManager(), [])
  const cfmReadyResolver = useRef<() => void>()
  const cfmReadyPromise = useMemo(() => new Promise<void>((resolve) => {
    cfmReadyResolver.current = resolve
  }), [])

  useEffect(function initCfm() {

    const autoSaveInterval = DEBUG_CFM_NO_AUTO_SAVE || DEBUG_SAVE_AS_V2 ? undefined : 5
    const _options: CFMAppOptions = {
      autoSaveInterval,
      // When running in the Activity Player, hide the hamburger menu
      hideMenuBar: urlParams.interactiveApi !== undefined,
      ui: {
        menuBar: {
          info: "Language menu",
          languageMenu: {
            currentLang: gLocale.current,
            options: locales.map(function (locale) {
                              return {
                                label: locale.langName,
                                langCode: locale.langCode,
                              }
                            }),
            onLangChanged: (langCode: string) => {
              gLocale.setCurrent(langCode)
              cfm.client.replaceMenu({ menu: getMenuConfig(cfm) })
            }
          },
          // languageAnchorIcon: LanguageMenuIcon,
        },

        // menuAnchorIcon: FileMenuIcon,
        // menuAnchorName: t("DG.fileMenu.fileMenuName"),
        menu: getMenuConfig(cfm),
        // subMenuExpandIcon: SubMenuExpandIcon,
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
      extension: CONFIG_SAVE_AS_V2 ? "codap" : "codap3",
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
          "src": codapResourcesUrl("example-documents/index.json"),
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
        ...(DEBUG_CFM_LOCAL_STORAGE ? ["localStorage"] : [])
      ],
      // appIcon: CODAPIcon,
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
      if (event.type === "openedFile" && onFileOpened) {
        onFileOpened()
      }
      const cfmReadyEvents = ["fileOpened", "ready"]
      if (cfmReadyEvents.includes(event.type)) {
        cfmReadyResolver.current?.()
      }
    })

    appState.setCFM(cfm)
  }, [cfm, onFileOpened])

  return { cfm, cfmReadyPromise }
}
