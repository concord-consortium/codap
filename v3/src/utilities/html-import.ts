import { IDataSet } from "../models/data/data-set"
import { insertImporterTile } from "./generic-import"

export function initiateImportFromHTML(html: string, data?: IDataSet) {
  insertImporterTile({
    contentType: "text/html",
    name: "Importer",
    text: html,
    targetDatasetName: data?.name
  })
}
