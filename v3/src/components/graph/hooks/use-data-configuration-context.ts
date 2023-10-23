import { createContext, useContext } from "react"
import {IGraphDataConfigurationModel} from "../models/graph-data-configuration-model"

export const GraphDataConfigurationContext = createContext<IGraphDataConfigurationModel | undefined>(undefined)

export const useGraphDataConfigurationContext = () => {
  return useContext(GraphDataConfigurationContext)
}
