import { createContext, createRef, useContext } from "react"
import { GetDividerBoundsFn } from "./case-tile-types"

const defaultRef = createRef<HTMLElement | null>()
export const AttributeHeaderDividerContext = createContext<React.RefObject<HTMLElement | null>>(defaultRef)

interface IProps {
  cellElt: HTMLElement | null
  getDividerBounds?: GetDividerBoundsFn
}

export function useAttributeHeaderDividerContext({ cellElt, getDividerBounds }: IProps) {
  const containerRef = useContext(AttributeHeaderDividerContext)
  const containerBounds = containerRef.current?.getBoundingClientRect()
  const cellBounds = cellElt?.getBoundingClientRect()
  if (!containerBounds || !cellBounds || !getDividerBounds) return {}

  const dividerBounds = getDividerBounds(containerBounds, cellBounds)

  return { containerElt: containerRef.current, dividerBounds }
}
