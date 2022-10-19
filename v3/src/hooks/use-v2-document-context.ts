import { createContext, useContext } from "react"
import { CodapV2Document } from "../v2/codap-v2-document"

export const V2DocumentContext = createContext<CodapV2Document | undefined>(undefined)

export const useV2DocumentContext = () => {
  return useContext(V2DocumentContext)
}
