import { CloudFileManagerClient, CloudFileManagerClientEvent } from "@concord-consortium/cloud-file-manager"
import { appState } from "../models/app-state"
import { isCodapV2Document } from "../v2/codap-v2-types"
import { CodapV2Document } from "../v2/codap-v2-document"
import { importV2Document } from "../components/import-v2-document"
import { wrapCfmCallback } from "./cfm-utils"

import build from "../../build_number.json"
import pkg from "../../package.json"

export function handleCFMEvent(cfmClient: CloudFileManagerClient, event: CloudFileManagerClientEvent) {
  // const { data, state, ...restEvent } = event
  // console.log("cfmEventCallback", JSON.stringify({ ...restEvent }))

  switch (event.type) {
    case "connected":
      cfmClient.setProviderOptions("documentStore", {
        appName: "DG",  // TODO: is this necessary for backward-compatibility?
        appVersion: pkg.version,
        appBuildNum: build.buildNumber
      })
      wrapCfmCallback(() => cfmClient._ui.setMenuBarInfo(`Version ${pkg.version}`))
      break
    // case "requiresUserInteraction":
    //   break
    // case "ready":
    //   break
    // case "closedFile":
    //   break
    case "getContent": {
      const content = appState.getDocumentSnapshot()
      event.callback({ content })
      break
    }
    // case "willOpenFile":
    //   break
    // case "newedFile":
    //   break
    case "openedFile": {
      const content = event.data.content
      if (isCodapV2Document(content)) {
        const v2Document = new CodapV2Document(content)
        importV2Document(v2Document)
      }
      else {
        appState.setDocument(content)
      }
      break
    }
    // case "savedFile":
    //   break
    // case "sharedFile":
    //   break
    // case "unsharedFile":
    //   break
    // case "importedData":
    //   break
    // case "renamedFile":
    //   break
    // case "log":
    //   break
  }
}
