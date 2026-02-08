import { IDataSet } from "../models/data/data-set"
import { initiateImportFromCsv } from "./csv-import"
import { initiateImportFromHTML } from "./html-import"

async function readHtmlFromClipboard(): Promise<string | undefined> {
  // clipboard.read() returns multiple MIME types (including text/html) but isn't
  // supported in all browsers (e.g. Firefox < 127). Fall back to readText() below.
  if (typeof navigator.clipboard.read !== "function") return undefined
  const items = await navigator.clipboard.read()
  for (const item of items) {
    if (item.types.includes("text/html")) {
      const blob = await item.getType("text/html")
      return await blob.text()
    }
  }
  return undefined
}

export async function initiateImportFromClipboard(data?: IDataSet) {
  const datasetName = data ? undefined : "clipboard data"
  const html = await readHtmlFromClipboard()
  if (html && /<table[\s>]/i.test(html)) {
    initiateImportFromHTML(html, data)
  } else {
    const text = html ? html : await navigator.clipboard.readText()
    initiateImportFromCsv({ text, data, datasetName })
  }
}
