import { createContext, createRef, useContext } from "react"

const defaultRef = createRef<HTMLElement | null>()
export const TileContainerContext = createContext<React.RefObject<HTMLElement | null>>(defaultRef)

export function useTileContainerContext() {
  return useContext(TileContainerContext)
}
