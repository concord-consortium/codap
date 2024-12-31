import { appState } from "../../models/app-state"
import { convertParsedCsvToDataSet, CsvParseResult, downloadCsvFile } from "../../utilities/csv-import"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIAsyncHandler, DIResources, DIUrl, DIValues } from "../data-interactive-types"
import { errorResult, fieldRequiredResult } from "./di-results"

export function getFilenameFromUrl(url: string) {
  return new URL(url, window.location.href).pathname.split("/").pop()
}

export const diDataContextFromURLHandler: DIAsyncHandler = {

  // The API tester has a template for this under the dataContext section.
  // Because the download is async, this is an DIAsyncHandler which
  // resolves with the API response.
  async create(_resources: DIResources, _values?: DIValues) {
    const values = _values as DIUrl | undefined
    if (!values || !(typeof values === "object") || !values.URL) {
      return fieldRequiredResult("create", "dataContextFromURL", "URL")
    }

    const url = values.URL

    return new Promise((resolve) => {
      const downloadFailedResult =
        errorResult(t("V3.DI.Error.downloadCSV", {vars: {url}}))
      try {
        downloadCsvFile(url,
          (results: CsvParseResult) => {
            const filename = getFilenameFromUrl(url)
            // TODO: look at v2 to figure out if it has a default name perhaps that is translated
            const ds = convertParsedCsvToDataSet(results, filename || "Imported Data")
            if (ds) {
              appState.document.content?.importDataSet(ds, { createDefaultTile: true })
              resolve({ success: true })
            }
            else {
              resolve(downloadFailedResult)
            }
          },
          (error) => {
            // It seems the error object returned by papaparse does not include useful information for
            // the user.
            resolve(downloadFailedResult)
          }
        )
      } catch (e) {
        resolve(downloadFailedResult)
      }
    })
  }
}

registerDIHandler("dataContextFromURL", diDataContextFromURLHandler)
