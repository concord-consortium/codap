import { parse, ParseResult } from "papaparse"
import { useEffect, useRef } from "react"

type RowType = Record<string, string>

export const useDropHandler = (selector: string, onImportData: (data: Array<RowType>, name?: string) => void) => {
  const eltRef = useRef<HTMLElement | null>(null)

  useEffect(function installListeners() {
    eltRef.current = document.querySelector(selector)

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

    eltRef.current?.addEventListener('dragover', dragOverHandler)
    eltRef.current?.addEventListener('drop', dropHandler)

    return () => {
      eltRef.current?.removeEventListener('dragover', dragOverHandler)
      eltRef.current?.removeEventListener('drop', dropHandler)
    }
  }, [onImportData, selector])

  // return element to which listeners were attached; useful for tests
  return eltRef.current
}
