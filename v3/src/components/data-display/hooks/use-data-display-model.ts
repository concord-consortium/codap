import { Context, useContext } from "react"
import { IDataDisplayContentModel, isDataDisplayContentModel } from "../models/data-display-content-model"
import { BaseDataDisplayModelContext } from "./use-base-data-display-model"

export const DataDisplayModelContext = BaseDataDisplayModelContext as Context<IDataDisplayContentModel | undefined>

export const useDataDisplayModelContext = () => {
  const context = useContext(BaseDataDisplayModelContext)
  if (!context || !isDataDisplayContentModel(context)) {
    throw new Error("useDataDisplayModelContext must be used within a DataDisplayModelContextProvider")
  }
  return context
}
