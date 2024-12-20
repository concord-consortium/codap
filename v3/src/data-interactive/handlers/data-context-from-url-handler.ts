import { appState } from "../../models/app-state"
import { convertParsedCsvToDataSet, CsvParseResult, downloadCsvFile } from "../../utilities/csv-import"
import { registerDIHandler } from "../data-interactive-handler"
import { DIErrorResult, DIHandler, diNotImplementedYet, DIResources, DIUrl, DIValues } from "../data-interactive-types"

const kInvalidValuesError: DIErrorResult = {
  success: false,
  values: {
    error: "dataContextFromURL requires a { URL: [url] } value"
  }
}

export function getFilenameFromUrl(url: string) {
  return new URL(url, window.location.href).pathname.split("/").pop()
}

export const diDataContextFromURLHandler: DIHandler = {

  // The API tester has a template for this under the dataContext section.
  // Because the download is async we won't know if this succeeded or failed until it
  // has been downloaded. As a first pass we always say it succeeds. And then when if
  // it fails we show an alert.
  create(resources: DIResources, _values?: DIValues) {
    const values = _values as DIUrl | undefined
    if (!values || !(typeof values === "object") || !values.URL) return kInvalidValuesError

    const url = values.URL

    const failureAlert = () => {
      // Because the handlers don't support async calls we just show a dialog when it fails
      appState.alert(`A plugin tried to import the URL ${url} and failed.`, "Import dataset failed")
    }

    try {
      downloadCsvFile(url,
        (results: CsvParseResult) => {
          const filename = getFilenameFromUrl(url)
          // TODO: look at v2 to figure out if it has a default name perhaps that is translated
          const ds = convertParsedCsvToDataSet(results, filename || "Imported Data")
          if (ds) {
            appState.document.content?.importDataSet(ds, { createDefaultTile: true })
          }
          else {
            // Because the handlers don't support async calls we just show a dialog when it fails
            failureAlert()
          }
        },
        (error) => {
          // It seems the error object returned by papaparse does not include useful information for
          // the user.
          failureAlert()
        }
      )

      return { success: true }
    } catch (e) {
      return { success: false, values: { error: "Failed to download CSV file"}}
    }
  }
}

registerDIHandler("dataContextFromURL", diDataContextFromURLHandler)
