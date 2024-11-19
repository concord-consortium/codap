import { CloudFileManagerClient, CloudFileManagerClientEvent } from "@concord-consortium/cloud-file-manager"
import { appState } from "../models/app-state"
import { removeDevUrlParams, urlParams } from "../utilities/url-params"
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
      // pass the version number for display in the CFM menu bar
      wrapCfmCallback(() => cfmClient._ui.setMenuBarInfo(`v${pkg.version} (${build.buildNumber})`))
      appState.setVersion(pkg.version)

      // load initial document specified via `url` parameter (if any)
      if (urlParams.url) {
        cfmClient.openUrlFile(urlParams.url)
      }
      break
    // case "requiresUserInteraction":
    //   break
    // case "ready":
    //   break
    // case "closedFile":
    //   break
    case "getContent": {
      // return the promise so tests can make sure it is complete
      return appState.getDocumentSnapshot().then(content => {
        event.callback(content)
      })
    }
    case "willOpenFile":
      removeDevUrlParams()
      break
    // case "newedFile":
    //   break
    case "openedFile": {
      const content = event.data.content
      const metadata = event.data.metadata
      // return the promise so tests can make sure it is complete
      return appState.setDocument(content, metadata)
    }
    case "savedFile": {
      const { content } = event.data
      // Compare the revisionId of the saved content with the revisionId of
      // the current content. If they are different, tell the CFM the document
      // is dirty again. This can happen if the save takes a while and user
      // changes the document during the save.
      if (!appState.isCurrentRevision(content.revisionId)) {
        cfmClient.dirty(true)
      }

      // The filename might have changed when the document was saved
      const filename = event.state?.metadata?.filename
      if (filename) {
        appState.document.setTitleFromFilename(filename)
      }
      break
    }
    // case "sharedFile":
    //   break
    // case "unsharedFile":
    //   break
    // case "importedData":
    //   break
    case "renamedFile": {
      // Possible Improvement: Add a custom undo entry when the file is renamed.
      // It would need to send the appropriate commands to the CFM to update the filename.
      const filename = event.state?.metadata?.filename
      if (filename) {
        appState.document.setTitleFromFilename(filename)
      }
      break
    }
    // case "log":
    //   break
  }
}
