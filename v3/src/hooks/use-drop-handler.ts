import { useEffect, useRef } from "react"
import { IDataSet } from "../data-model/data-set"
import { convertParsedCsvToDataSet, CsvParseResult, importCsvFile } from "../utilities/csv-import"
import { safeJsonParse } from "../utilities/js-utils"
import { CodapV2Document } from "../v2/codap-v2-document"
import { ICodapV2Document } from "../v2/codap-v2-types"

function importCodapDocument(file: File | null, onComplete: (document: CodapV2Document) => void) {
  const reader = new FileReader()
  reader.onload = () => {
    const result = reader.result && safeJsonParse<ICodapV2Document>(reader.result as string)
    const document = result && new CodapV2Document(result)
    document && onComplete(document)
  }
  file && reader.readAsText(file)
}

interface IDropHandler {
  selector: string
  onImportDataSet?: (data: IDataSet) => void
  onImportDocument?: (document: CodapV2Document) => void
}
export const useDropHandler = ({ selector, onImportDataSet, onImportDocument }: IDropHandler) => {
  const eltRef = useRef<HTMLElement | null>(null)

  useEffect(function installListeners() {
    eltRef.current = document.querySelector(selector)

    function dragOverHandler(event: DragEvent) {
      // Prevent default behavior (Prevent file from being opened)
      event.preventDefault()
    }

    function dropHandler(event: DragEvent) {

      function onCompleteCodapImport(document: CodapV2Document) {
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
          // If dropped items aren't files, reject them
          if (event.dataTransfer.items[i].kind === 'file') {
            const file = event.dataTransfer.items[i].getAsFile()
            const nameParts = file?.name.toLowerCase().split(".")
            const extension = nameParts?.length ? nameParts[nameParts.length - 1] : ""
            switch (extension) {
              case "codap":
                importCodapDocument(file, onCompleteCodapImport)
                break
              case "csv":
                importCsvFile(file, onCompleteCsvImport)
                break
            }
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
  }, [onImportDataSet, onImportDocument, selector])

  // return element to which listeners were attached; useful for tests
  return eltRef.current
}
