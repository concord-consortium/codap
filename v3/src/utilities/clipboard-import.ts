import { IClipboardContent, readClipboard } from "../lib/clipboard/clipboard-utils"
import { IDataSet } from "../models/data/data-set"
import { initiateImportFromCsv } from "./csv-import"
import { initiateImportFromHTML } from "./html-import"

export type ClipboardImportFormat = "html" | "csv"

const kHtmlTableRegex = /<table[\s>]/i

// Returns the format clipboard content would be imported as, or undefined if there's nothing to import.
export function getClipboardImportFormat(content: IClipboardContent): ClipboardImportFormat | undefined {
  if (content.html && kHtmlTableRegex.test(content.html)) return "html"
  if (content.text?.trim()) return "csv"
}

// Imports clipboard content into `dataSet`, or into a new "clipboard data" dataset if none is given.
// Returns the format used, or undefined if the content was empty and nothing was imported.
export function importClipboardContent(content: IClipboardContent, dataSet?: IDataSet) {
  const format = getClipboardImportFormat(content)
  if (format === "html" && content.html) {
    initiateImportFromHTML(content.html, dataSet)
  } else if (format === "csv" && content.text) {
    initiateImportFromCsv({ text: content.text, data: dataSet, datasetName: dataSet ? undefined : "clipboard data" })
  }
  return format
}

/**
 * @deprecated Temporary until the menu call sites switch to `useClipboard()`.
 */
export async function initiateImportFromClipboard(data?: IDataSet) {
  const { content } = await readClipboard()
  importClipboardContent(content, data)
}
