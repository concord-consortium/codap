import { useLayoutEffect } from "react"
import { kCodapAppElementId } from "../../components/constants"
import { uiState } from "../../models/ui-state"
import { initializeEmbeddedServer } from "./embedded-server"

/**
 * Hook to initialize embedded mode features.
 * - Adds 'embedded-mode' CSS class to root element for transparent background styling
 * - Initializes embedded server for iframePhone communication with parent window
 */
export function useEmbeddedMode() {
  // Add embedded-mode class to root element for transparent background styling
  useLayoutEffect(() => {
    if (uiState.embeddedMode) {
      document.getElementById(kCodapAppElementId)?.classList.add("embedded-mode")
    }
    return () => {
      document.getElementById(kCodapAppElementId)?.classList.remove("embedded-mode")
    }
  }, [])

  // Initialize embedded server for iframePhone communication
  useLayoutEffect(() => {
    if (uiState.embeddedServer) {
      initializeEmbeddedServer()
    }
  }, [])
}
