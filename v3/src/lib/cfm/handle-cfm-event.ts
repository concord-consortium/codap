import { CloudFileManagerClient, CloudFileManagerClientEvent } from "@concord-consortium/cloud-file-manager"
import { cloneDeep } from "lodash"
import build from "../../../build_number.json"
import pkg from "../../../package.json"
import { appState } from "../../models/app-state"
import { t } from "../../utilities/translation/translate"
import { removeDevUrlParams, urlParams } from "../../utilities/url-params"
import { DEBUG_CFM_EVENTS, DEBUG_CFM_NO_AUTO_SAVE } from "../debug"
import { wrapCfmCallback } from "./cfm-utils"
import { resolveDocument } from "./resolve-document"
import { hideSplashScreen } from "./splash-screen"
import { isCodapV2Document } from "../../v2/codap-v2-types"

// -1 is used to disable autosave because the CFM's client.autoSave function only takes 
// numbers and -1 it is more clear than 0. Also if the autoSaveIntervale is falsy, then 
// in some places the CFM will not disable the autoSave if it was already enabled.
export const kCFMAutoSaveDisabledInterval = -1
export const kCFMAutoSaveInterval = DEBUG_CFM_NO_AUTO_SAVE ? kCFMAutoSaveDisabledInterval : 5

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
    case "requiresUserInteraction":
    case "ready":
      hideSplashScreen()
      break
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
    //   // This was hiding the splashscreen on v2. However I think "ready" will be called
    //   // anyhow, so it doesn't seem necessary to hide the splashscreen here too.
    //   // If the splashscreen continued to show for some time even after the app was loaded,
    //   // then it would make since to hide it here, so the user doesn't have to wait again.
    //   break
    case "openedFile": {
      const { content, metadata } = event.data

      try {
        // Pull the shared metadata out of the content if it exists
        // Otherwise use the shared metadata passed from the CFM
        const cfmSharedMetadata = (!!content && typeof content === "object"
                                    ? content.metadata?.shared
                                    : undefined) ?? metadata?.shared ?? {}

        // Clone this metadata because that is what CODAPv2 did so we do the
        // same to be safe
        const clonedCfmSharedMetadata = cloneDeep(cfmSharedMetadata)

        const resolvedDocument = await resolveDocument(content, metadata)
        
        let shouldAutoSaveDocument = true
        if (isCodapV2Document(resolvedDocument)) {
          // Disable autoSave for v2 documents that were not saved by CODAP v3
          // This disabling of autoSave might be temporary until we are confident that
          // CODAPv3 won't break v2 documents. If this disabling becomes permanent we
          // should use a more advanced mechanism to determine which application saved
          // the document. In the meantime we just look at the appVersion. If it isn't
          // a v3 appVersion, then we assume this is a v2 document.
          // If CFM file menu is hidden because of the interactiveApi url parameter then
          // we keep autoSave enabled.
          // Note: if auto save is disabled by the debug flag DEBUG_CFM_NO_AUTO_SAVE,
          // that will override this, and is handled by the value of kCFMAutoSaveInterval
          // computed above.
          // Note: in some v2 documents the appVersion is not set
          const loadedDocumentWasSavedByV3 = !!resolvedDocument.appVersion?.startsWith("3.")
          shouldAutoSaveDocument = loadedDocumentWasSavedByV3 || urlParams.interactiveApi !== undefined
          if (!shouldAutoSaveDocument) {
            // eslint-disable-next-line no-console
            console.log("Disabling autoSave for v2 document that was saved by CODAPv2",
              { appVersion: resolvedDocument.appVersion })
            // NOTE: Whether the document is saved automatically depends on more factors.
            // For example the CFM provider has to support autoSave.
            cfmClient.autoSave(kCFMAutoSaveDisabledInterval)
          }
          // If shouldAutoSaveDocument is true, we do not enable autoSave yet.
          // At this point the appState.document will still be the original document 
          // not the new one we are trying to open. The new document gets set by
          // setDocument below. If autoSave is enabled before this, the CFM might decide
          // to save the original document before the new document is set. The original
          // document might be one that we don't want to autoSave.
        } 
        await appState.setDocument(resolvedDocument, metadata)

        // Now that the new document is set as the appState.document, it is
        // safe to enable autoSave.
        // Note: appState.document.version will always start with '3." here because
        // the conversion from v2 to v3 documents does not migrate the appVersion.
        if (shouldAutoSaveDocument) {
          cfmClient.autoSave(kCFMAutoSaveInterval)
        }

        // acknowledge a successful open and return shared metadata
        event.callback(null, clonedCfmSharedMetadata)
      } catch (e) {
        // Log the error to the console so we can debug the problem
        // The error is sent in the cause so that Rollbar has a chance of fully recording
        // the cause of this error
        console.error("Error opening the document.", {cause: e})
        // The message and stack of the error are logged in a group so it is easier
        // to view them in the console.
        if (isError(e)) {
          /* eslint-disable no-console */
          console.groupCollapsed("Details of document error")
          console.log(e.message)
          console.log(e.stack)
          console.groupEnd()
          /* eslint-enable no-console */
        }

        // Have the CFM show an error dialog
        event.callback(t("DG.AppController.openDocument.error.general"))
        // Clear the dirty state so the red "unsaved" badge isn't visible behind the error message
        if ("state" in event && typeof event.state === "object") {
          event.state.dirty = false
        }
        // Close the file so the title resets, and any residual metadata or content are not
        // preserved by the CFM
        cfmClient.closeFile()
      }

      break
    }
    case "savedFile": {
      // TODO: We might will want to enable autoSave if we had disabled it previously.
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

function isError(e: unknown): e is {message: string, stack: string} {
  return !!e && typeof e === "object" && "message" in e && "stack" in e
}
