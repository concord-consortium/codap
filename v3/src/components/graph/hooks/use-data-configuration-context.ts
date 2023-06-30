import { createContext, useContext } from "react"
import { IDataConfigurationModel } from "../../data-display/models/data-configuration-model"

export const DataConfigurationContext = createContext<IDataConfigurationModel | undefined>(undefined)

export const useDataConfigurationContext = () => {
  return useContext(DataConfigurationContext)
}
