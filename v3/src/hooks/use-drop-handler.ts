import { parse, ParseResult } from "papaparse"
import { useEffect } from "react"

type RowType = Record<string, string>

export const useDropHandler = (selector: string, onImportData: (data: Array<RowType>, name?: string) => void) => {

  useEffect(function installListeners() {
    const elt: HTMLElement | null = document.querySelector(selector)

    function dragOverHandler(event: DragEvent) {
      // Prevent default behavior (Prevent file from being opened)
      event.preventDefault()
    }

    function dropHandler(event: DragEvent) {

      function finishUp(results: ParseResult<RowType>, aFile: any) {
        onImportData?.(results.data, aFile.name)
      }

      // Prevent default behavior (Prevent file from being opened)
      event.preventDefault()
      if (event.dataTransfer?.items) {
        // Use DataTransferItemList interface to access the file(s)
        for (let i = 0; i < event.dataTransfer.items.length; i++) {
          // If dropped items aren't files, reject them
          if (event.dataTransfer.items[i].kind === 'file') {
            const file = event.dataTransfer.items[i].getAsFile()
            parse(file, {
              header: true,
              complete: finishUp,
            })
          }
        }
      }
      // Pass event to removeDragData for cleanup
      removeDragData(event)
    }

    function removeDragData(event: DragEvent) {
      if (event.dataTransfer) {
        if (event.dataTransfer.items) {
          // Use DataTransferItemList interface to remove the drag data
          event.dataTransfer.items.clear()
        } else {
          // Use DataTransfer interface to remove the drag data
          event.dataTransfer.clearData()
        }
      }
    }

    elt?.addEventListener('dragover', dragOverHandler)
    elt?.addEventListener('drop', dropHandler)

    return () => {
      elt?.removeEventListener('dragover', dragOverHandler)
      elt?.removeEventListener('drop', dropHandler)
    }
  }, [onImportData, selector])
}
