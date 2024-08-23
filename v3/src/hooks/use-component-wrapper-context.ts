import { createContext, createRef, useContext } from "react"

const defaultRef = createRef<HTMLElement | null>()
export const ComponentWrapperContext = createContext<React.RefObject<HTMLElement | null>>(defaultRef)

export function useComponentWrapperContext() {
  return useContext(ComponentWrapperContext)
}
