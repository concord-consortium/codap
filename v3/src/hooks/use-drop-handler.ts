import { useEffect, useRef } from "react"
import { IDataSet } from "../models/data/data-set"
import {
  convertParsedCsvToDataSet, CsvParseResult, importCsvFile, initiateImportFromCsv
} from "../utilities/csv-import"

const USE_IMPORTER_PLUGIN_FOR_CSV_FILE = true

export interface IDropHandler {
  selector: string
  onImportDataSet?: (data: IDataSet) => void
  onImportDocument?: (file: File) => void
  onHandleUrlDrop?: (url: string) => void
  onSetIsDragOver?: (isDragOver: boolean) => void
}
export const useDropHandler = ({
  selector, onImportDataSet, onImportDocument, onHandleUrlDrop, onSetIsDragOver: setIsDragOver
}: IDropHandler) => {
  const eltRef = useRef<HTMLElement | null>(null)

  useEffect(function installListeners() {
    eltRef.current = document.querySelector(selector)

    function dragOverHandler(event: DragEvent) {
      // Prevent default behavior (Prevent file from being opened)
      event.preventDefault()
      setIsDragOver?.(true)
    }

    function dropHandler(event: DragEvent) {

      // For local .csv import
      function onCompleteCsvImport(results: CsvParseResult, aFile: any) {
        const ds = convertParsedCsvToDataSet(results, aFile.name)
        onImportDataSet?.(ds)
      }

      // Prevent default behavior (Prevent file from being opened)
      event.preventDefault()
      if (event.dataTransfer?.items) {
        // Use DataTransferItemList interface to access the file(s)
        for (let i = 0; i < event.dataTransfer.items.length; i++) {
          const item = event.dataTransfer.items[i]
          // If dropped items aren't files, reject them
          if (item.kind === 'file') {
            const file = item.getAsFile()
            const nameParts = file?.name.toLowerCase().split(".")
            const extension = nameParts?.length ? nameParts[nameParts.length - 1] : ""
            switch (extension) {
              case "codap":
              case "codap3":
                file && onImportDocument?.(file)
                break
              case "csv":
                if (USE_IMPORTER_PLUGIN_FOR_CSV_FILE) {
                  // For .csv import via Importer plugin
                  file && initiateImportFromCsv({ file })
                }
                else {
                  // For local .csv import without Importer plugin
                  importCsvFile(file, onCompleteCsvImport)
                }
            }
          }
          else if (item.kind === "string" && item.type === "text/uri-list") {
            item.getAsString(url => {
              if (url) {
                if (url.replace(/.*\./g, '') === 'csv') {
                  // For .csv import via Importer plugin
                  initiateImportFromCsv({ url })
                } else {
                  const result = /di=(.+)/.exec(url)
                  onHandleUrlDrop?.(result?.[1] || url)
                }
              }
            })
          }
        }
      }
      // Pass event to removeDragData for cleanup
      removeDragData(event)
    }

    function removeDragData(event: DragEvent) {
      if (event.dataTransfer) {
        if (event.dataTransfer?.items?.clear) {
          // Use DataTransferItemList interface to remove the drag data
          event.dataTransfer.items.clear()
        } else {
          // Use DataTransfer interface to remove the drag data
          event.dataTransfer.clearData()
        }
      }
      setIsDragOver?.(false)
    }

    eltRef.current?.addEventListener('dragover', dragOverHandler)
    eltRef.current?.addEventListener('drop', dropHandler)

    return () => {
      eltRef.current?.removeEventListener('dragover', dragOverHandler)
      eltRef.current?.removeEventListener('drop', dropHandler)
    }
  }, [onHandleUrlDrop, onImportDataSet, onImportDocument, selector, setIsDragOver])

  // return element to which listeners were attached; useful for tests
  return eltRef.current
}
