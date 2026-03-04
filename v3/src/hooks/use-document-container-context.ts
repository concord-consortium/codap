import { createContext, createRef, useContext } from "react"

const defaultRef = createRef<HTMLElement | null>()
export const DocumentContainerContext = createContext<React.RefObject<HTMLElement | null>>(defaultRef)

export function useDocumentContainerContext() {
  return useContext(DocumentContainerContext)
}
