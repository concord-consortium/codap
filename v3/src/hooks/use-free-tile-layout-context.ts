import { createContext, useContext } from "react"
import { IFreeTileLayout } from "../models/document/free-tile-row"

export const FreeTileLayoutContext = createContext<IFreeTileLayout | undefined>(undefined)

export const useFreeTileLayoutContext = () => {
  return useContext(FreeTileLayoutContext)
}
