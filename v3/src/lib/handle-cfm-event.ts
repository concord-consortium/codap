import { cloneDeep } from "lodash"
import { CloudFileManagerClient, CloudFileManagerClientEvent } from "@concord-consortium/cloud-file-manager"
import { appState } from "../models/app-state"
import { removeDevUrlParams, urlParams } from "../utilities/url-params"
import { wrapCfmCallback } from "./cfm-utils"
import { DEBUG_CFM_EVENTS } from "./debug"

import build from "../../build_number.json"
import pkg from "../../package.json"

export async function handleCFMEvent(cfmClient: CloudFileManagerClient, event: CloudFileManagerClientEvent) {
  if (DEBUG_CFM_EVENTS) {
    // We clone the event because the CFM reuses the same objects across multiple events
    // eslint-disable-next-line no-console
    console.log("cfmEvent", event.type, cloneDeep(event))
  }

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
      const content = await appState.getDocumentSnapshot()
      // getDocumentSnapshot makes a clone of the snapshot so it is safe to mutate in place.
      const cfmContent = content as any

      // Add 'metadata.shared' property based on the CFM event shared data
      // The CFM assumes this is where the shared metadata is when it tries
      // to strip it out in `getDownloadBlob`
      const cfmSharedMetadata = event.data?.shared
      if (cfmSharedMetadata) {
        // In CODAPv2 the CFM metadata is cloned, so we do the same here to be safe
        cfmContent.metadata = { shared: cloneDeep(cfmSharedMetadata) }
      }
      event.callback(cfmContent)

      break
    }
    case "willOpenFile":
      removeDevUrlParams()
      break
    // case "newedFile":
    //   break
    case "openedFile": {
      const content = event.data.content
      const metadata = event.data.metadata

      // Pull the shared metadata out of the content if it exists
      // Otherwise use the shared metadata passed from the CFM
      const cfmSharedMetadata = content?.metadata?.shared || metadata?.shared || {}

      // Clone this metadata because that is what CODAPv2 did so we do the
      // same to be safe
      const clonedCfmSharedMetadata = cloneDeep(cfmSharedMetadata)

      await appState.setDocument(content, metadata)

      // acknowledge a successful open and return shared metadata
      event.callback(null, clonedCfmSharedMetadata)

      break
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
    case "sharedFile":
    case "unsharedFile":
      // Make the document dirty to trigger a save with the updated sharing info
      // If the file is already shared, and the user updates the shared document, the
      // "sharedFile" event will happen again.
      // Currently it isn't necessary to update the sharing info in this case, but
      // perhaps in the future the sharing info will include properties that change
      // each time, such as a timestamp for when the document was shared.
      // Due to the design of the CFM event system we need to do this in the next time slice
      await new Promise(resolve => setTimeout(resolve, 0))
      cfmClient.dirty(true)
      break
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
