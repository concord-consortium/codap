import React, {useEffect, useRef} from "react"
import {parse, ParseResult} from 'papaparse'

type RowType = Record<string, string>

interface IProps {
  onImportData: (data: Array<RowType>, name?: string) => void
}
export const DropHandler = ({ onImportData }: IProps) => {
  const drop = useRef<HTMLDivElement>(null)

  useEffect(function installListeners() {
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

    const currRef = drop.current
    if (drop.current) {
      drop.current.addEventListener('dragover', dragOverHandler)
      drop.current.addEventListener('drop', dropHandler)
    }

    return () => {
      if (currRef) {
        currRef.removeEventListener('dragover', dragOverHandler)
        currRef.removeEventListener('drop', dropHandler)
      }
    }
  }, [onImportData])

  return (
    <div className={'drop-handler'} ref={drop}>
    </div>
  )
}
