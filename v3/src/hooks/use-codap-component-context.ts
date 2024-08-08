import { createContext, createRef, useContext } from "react"

const defaultRef = createRef<HTMLElement | null>()
export const CodapComponentContext = createContext<React.RefObject<HTMLElement | null>>(defaultRef)

export function useCodapComponentContext() {
  return useContext(CodapComponentContext)
}
