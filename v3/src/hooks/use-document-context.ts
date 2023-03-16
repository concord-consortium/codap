import { createContext, useContext } from "react"
import { IDocumentContentModel } from "../models/document/document-content"

export const DocumentContext = createContext<IDocumentContentModel | undefined>(undefined)

export const useDocumentContext = () => {
  return useContext(DocumentContext)
}
