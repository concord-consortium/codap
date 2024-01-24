import { CloudFileManager } from "@concord-consortium/cloud-file-manager"

// these functions are separated out for ease of mocking in tests

// creates a CloudFileManager instance
export function createCloudFileManager() {
  return new CloudFileManager()
}

// used to wrap (e.g. for mocking purposes) direct calls to the CFM (e.g. `cfm.client._ui.setMenuBarInfo()`)
export function wrapCfmCallback(callbackFn: () => void) {
  callbackFn()
}
