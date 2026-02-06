import { IImportedFile } from "../lib/cfm/use-cloud-file-manager"
import { getExtensionFromUrl, isGoogleSheetsUrl } from "./urls"

export { isGoogleSheetsUrl }

export interface IImportableFileTypeInfo {
  extensions: string[]
  contentTypes: string[]
}

export const importableFileTypes = ["csv", "image", "codap", "geojson", "html", "google-sheets"] as const
export type ImportableFileType = typeof importableFileTypes[number]

export const importableFileTypeMap: Record<ImportableFileType, IImportableFileTypeInfo> = {
  codap: {
    extensions: ["codap", "codap3", "json", "xjson", "xcodap"],
    contentTypes: ["application/codap", "application/vnd.codap"]
  },
  csv: {
    extensions: ["csv", "txt", "tsv", "tab"],
    contentTypes: ["text/csv", "application/csv", "text/plain", "text/tab-separated-values"]
  },
  geojson: {
    extensions: ["geojson"],
    contentTypes: ["application/geo+json"]
  },
  "google-sheets": {
    extensions: [],
    contentTypes: ["application/vnd.google-apps.spreadsheet"]
  },
  html: {
    extensions: ["html", "htm"],
    contentTypes: ["text/html"]
  },
  image: {
    extensions: ["png", "jpg", "jpeg", "gif", "svg", "svgz"],
    contentTypes: ["image/png", "image/jpeg", "image/gif", "image/svg+xml"]
  }
}

export function getImportableFileTypeFromFile(file: File | IImportedFile | null): ImportableFileType | undefined {
  const extension = getExtensionFromFile(file)
  if (extension) {
    for (const ft of importableFileTypes) {
      if (importableFileTypeMap[ft]?.extensions.includes(extension)) {
        return ft
      }

    }
  }
  return undefined
}

export function getImportableFileTypeFromUrl(url: string): ImportableFileType | undefined {
  // Check for data URLs with image content type
  if (url.startsWith("data:image/")) {
    return "image"
  }

  // Check for Google Sheets URL pattern (doesn't have a file extension)
  if (isGoogleSheetsUrl(url)) {
    return "google-sheets"
  }

  // Extension-based detection
  const extension = getExtensionFromUrl(url)
  if (extension) {
    for (const ft of importableFileTypes) {
      if (importableFileTypeMap[ft]?.extensions.includes(extension)) {
        return ft
      }
    }
  }
  return undefined
}

export function getImportableFileTypeFromDataTransferFile(item: DataTransferItem): ImportableFileType | undefined {
  if (item.kind === "file") {
    // first check content type
    for (const ft of importableFileTypes) {
      const info = importableFileTypeMap[ft]
      if (info.contentTypes.includes(item.type)) {
        return ft
      }
    }

    // Fallback to checking extension if content type didn't match
    const file = item.getAsFile()
    return getImportableFileTypeFromFile(file)
  }
}

export function getExtensionFromFile(file: File | IImportedFile | null): string | undefined {
  const pathParts = (file?.name ?? "")
    .toLowerCase()
    .split(".")
    .map(part => part.trim())
    .filter(part => part.length > 0)
  return pathParts.length > 1 ? pathParts[pathParts.length - 1] : undefined
}

export function stripExtensionFromFilename(filename: string): string {
  // Handle filenames starting with a dot (e.g., ".gitignore")
  if (filename.startsWith(".")) {
    const withoutLeadingDot = filename.slice(1)
    const _lastDotIndex = withoutLeadingDot.lastIndexOf(".")

    // If no dot after the leading dot, return original (e.g., ".gitignore")
    if (_lastDotIndex === -1) {
      return filename
    }

    // Otherwise, strip the extension after the leading dot (e.g., ".hidden.jpg" -> ".hidden")
    return `.${withoutLeadingDot.slice(0, _lastDotIndex)}`
  }

  // For regular filenames, find the last dot
  const lastDotIndex = filename.lastIndexOf(".")

  // If no dot found, return the original filename
  if (lastDotIndex === -1) {
    return filename
  }

  // Strip everything from the last dot onwards
  return filename.slice(0, lastDotIndex)
}
