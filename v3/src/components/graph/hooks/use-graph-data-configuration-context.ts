import { useContext } from "react"
import { isGraphDataConfigurationModel } from "../models/graph-data-configuration-model"
import { DataConfigurationContext } from "../../data-display/hooks/use-data-configuration-context"

export const GraphDataConfigurationContext = DataConfigurationContext

export const useGraphDataConfigurationContext = () => {
  const config =  useContext(GraphDataConfigurationContext)
  return isGraphDataConfigurationModel(config) ? config : undefined
}
