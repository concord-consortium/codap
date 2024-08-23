import { createContext, createRef, useContext } from "react"

const defaultRef = createRef<HTMLDivElement | null>()
export const DocumentContainerContext = createContext<React.RefObject<HTMLDivElement | null>>(defaultRef)

export function useDocumentContainerContext() {
  return useContext(DocumentContainerContext)
}
