import { createContext, useContext } from "react"
import { IDocumentContentModel } from "../models/document/document-content"

export const DocumentContentContext = createContext<IDocumentContentModel | undefined>(undefined)

export const useDocumentContent = () => {
  return useContext(DocumentContentContext)
}
