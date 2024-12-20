import { appState } from "../../models/app-state"
import { convertParsedCsvToDataSet, CsvParseResult, downloadCsvFile } from "../../utilities/csv-import"
import { registerDIHandler } from "../data-interactive-handler"
import { DIAsyncHandler, DIErrorResult, DIResources, DIUrl, DIValues } from "../data-interactive-types"

const kInvalidValuesError: DIErrorResult = {
  success: false,
  values: {
    error: "dataContextFromURL requires a { URL: [url] } value"
  }
}

export function getFilenameFromUrl(url: string) {
  return new URL(url, window.location.href).pathname.split("/").pop()
}

export const diDataContextFromURLHandler: DIAsyncHandler = {

  // The API tester has a template for this under the dataContext section.
  // Because the download is async, this is an DIAsyncHandler which
  // resolves with the API response.
  async create(resources: DIResources, _values?: DIValues) {
    const values = _values as DIUrl | undefined
    if (!values || !(typeof values === "object") || !values.URL) return kInvalidValuesError

    const url = values.URL

    return new Promise((resolve) => {
      const errorResult = {
        success: false,
        values: { error: `Failed to download and import ${url}.`}
      } as const
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
              resolve(errorResult)
            }
          },
          (error) => {
            // It seems the error object returned by papaparse does not include useful information for
            // the user.
            resolve(errorResult)
          }
        )
      } catch (e) {
        resolve(errorResult)
      }
    })
  }
}

registerDIHandler("dataContextFromURL", diDataContextFromURLHandler)
