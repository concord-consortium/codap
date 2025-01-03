import { createContext, useContext } from "react"

export const CfmContext = createContext<any>(undefined)

export const useCfmContext = () => {
  return useContext(CfmContext)
}
