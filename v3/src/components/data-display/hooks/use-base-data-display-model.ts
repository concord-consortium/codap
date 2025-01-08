import { createContext, useContext } from "react"
import { IBaseDataDisplayModel } from "../models/base-data-display-content-model"

export const BaseDataDisplayModelContext = createContext<IBaseDataDisplayModel | undefined>(undefined)

export const useBaseDataDisplayModelContext = () => {
  const context = useContext(BaseDataDisplayModelContext)
  if (!context) {
    throw new Error("useBaseDataDisplayModelContext must be used within a BaseDataDisplayModelContextProvider")
  }
  return context
}
