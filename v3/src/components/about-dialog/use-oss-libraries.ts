import { useEffect, useState } from "react"
import { getBuildAssetUrl } from "../../utilities/urls"
import { kOssLibrariesFile } from "./about-dialog-constants"

export interface IOssLibrary {
  name: string
  version: string
  license: string
}

export type OssLibrariesState =
  { status: "loading" } | { status: "loaded", libraries: IOssLibrary[] } | { status: "error" }

// shared by every use of the hook, so the list is only fetched once per session
let librariesRequest: Maybe<Promise<IOssLibrary[]>>

// exported for testing
export function resetOssLibrariesRequest() {
  librariesRequest = undefined
}

function requestOssLibraries() {
  if (!librariesRequest) {
    librariesRequest = fetch(getBuildAssetUrl(kOssLibrariesFile)).then(response => {
      if (!response.ok) throw new Error(`Unable to load ${kOssLibrariesFile} (${response.status})`)
      return response.json() as Promise<IOssLibrary[]>
    })
    // let a later use try again after a failure
    librariesRequest.catch(() => { resetOssLibrariesRequest() })
  }
  return librariesRequest
}

// Loads the list of bundled third-party packages once `enabled` is true.
export function useOssLibraries(enabled: boolean): OssLibrariesState {
  const [state, setState] = useState<OssLibrariesState>({ status: "loading" })

  useEffect(() => {
    if (!enabled) return
    let isCurrent = true
    requestOssLibraries()
      .then(libraries => isCurrent && setState({ status: "loaded", libraries }))
      .catch(() => isCurrent && setState({ status: "error" }))
    return () => { isCurrent = false }
  }, [enabled])

  return state
}
