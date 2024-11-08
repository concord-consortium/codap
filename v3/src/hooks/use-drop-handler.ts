import { useEffect, useRef } from "react"
import { IDataSet } from "../models/data/data-set"
import { IDocumentModelSnapshot } from "../models/document/document"
import { convertParsedCsvToDataSet, CsvParseResult, importCsvFile } from "../utilities/csv-import"
import { safeJsonParse } from "../utilities/js-utils"
import { ICodapV2DocumentJson } from "../v2/codap-v2-types"

function importCodapDocument(
  file: File | null,
  onComplete: (document: IDocumentModelSnapshot | ICodapV2DocumentJson) => void
) {
  const reader = new FileReader()
  reader.onload = () => {
    const document = reader.result &&
      safeJsonParse<IDocumentModelSnapshot | ICodapV2DocumentJson>(reader.result as string)
    document && onComplete(document)
  }
  file && reader.readAsText(file)
}

export interface IDropHandler {
  selector: string
  onImportDataSet?: (data: IDataSet) => void
  onImportDocument?: (document: IDocumentModelSnapshot | ICodapV2DocumentJson) => void
  onHandleUrlDrop?: (url: string) => void
}
export const useDropHandler = ({
  selector, onImportDataSet, onImportDocument, onHandleUrlDrop
}: IDropHandler) => {
  const eltRef = useRef<HTMLElement | null>(null)

  useEffect(function installListeners() {
    eltRef.current = document.querySelector(selector)

    function dragOverHandler(event: DragEvent) {
      // Prevent default behavior (Prevent file from being opened)
      event.preventDefault()
    }

    function dropHandler(event: DragEvent) {

      function onCompleteCodapImport(document: IDocumentModelSnapshot | ICodapV2DocumentJson) {
        onImportDocument?.(document)
      }

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
                importCodapDocument(file, onCompleteCodapImport)
                break
              case "csv":
                importCsvFile(file, onCompleteCsvImport)
                break
            }
          }
          else if (item.kind === "string" && item.type === "text/uri-list") {
            item.getAsString(url => {
              if (url) {
                const result = /di=(.+)/.exec(url)
                onHandleUrlDrop?.(result?.[1] || url)
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
    }

    eltRef.current?.addEventListener('dragover', dragOverHandler)
    eltRef.current?.addEventListener('drop', dropHandler)

    return () => {
      eltRef.current?.removeEventListener('dragover', dragOverHandler)
      eltRef.current?.removeEventListener('drop', dropHandler)
    }
  }, [onHandleUrlDrop, onImportDataSet, onImportDocument, selector])

  // return element to which listeners were attached; useful for tests
  return eltRef.current
}
