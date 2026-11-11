import { useCallback } from "react"
import { clipboardManager } from "../../lib/clipboard/clipboard-manager"
import { IDataSet } from "../../models/data/data-set"

// Clipboard operations for components. The dialogs and messages these may trigger are rendered by the
// app-level ClipboardHost, so callers never need to render or manage them.
export function useClipboard() {
  const copyText = useCallback((text: string, description: string) => {
    return clipboardManager.copyText(text, description)
  }, [])

  const importData = useCallback((dataSet?: IDataSet) => {
    return clipboardManager.importData(dataSet)
  }, [])

  return { copyText, importData }
}
