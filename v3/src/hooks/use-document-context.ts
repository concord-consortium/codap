import { createContext, useContext } from "react"
import { IDocumentModel } from "../models/document/document"

export const DocumentContext = createContext<IDocumentModel | undefined>(undefined)

export const useDocumentContext = () => {
  return useContext(DocumentContext)
}
