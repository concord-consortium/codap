import { CloudFileManager, CloudFileManagerClientEvent } from "@concord-consortium/cloud-file-manager"
import { ReactNode } from "react"
import { Root } from "react-dom/client"

// these functions are separated out for ease of mocking in tests

// creates a CloudFileManager instance
export function createCloudFileManager() {
  return new CloudFileManager()
}

export function clientConnect(cfm: CloudFileManager, handler: (event: CloudFileManagerClientEvent) => void) {
  cfm.clientConnect(handler)
}

export function renderRoot(root: Root | undefined, content: ReactNode) {
  root?.render(content)
}

// used to wrap (e.g. for mocking purposes) direct calls to the CFM (e.g. `cfm.client._ui.setMenuBarInfo()`)
export function wrapCfmCallback(callbackFn: () => void) {
  callbackFn()
}
