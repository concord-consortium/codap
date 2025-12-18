import { useEffect } from "react"
import { urlParams } from "../utilities/url-params"
import { uiState } from "../models/ui-state"

export function useUIState() {
  useEffect(() => {
    // In case URL params change, update uiState accordingly
    uiState.setStandaloneMode(urlParams.standalone)
  }, [])
}
