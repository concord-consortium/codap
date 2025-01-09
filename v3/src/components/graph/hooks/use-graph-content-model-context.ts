import { Context, useContext } from "react"
import { IGraphContentModel, isGraphContentModel } from "../models/graph-content-model"
import { DataDisplayModelContext } from "../../data-display/hooks/use-data-display-model"

// GraphContentModelContext and DataDisplayModelContext share the same underlying context
// It is casted here to force users of GraphContentModelContext.Provider to give it
// a IGraphContentModel
export const GraphContentModelContext = DataDisplayModelContext as Context<IGraphContentModel| undefined>

export const useGraphContentModelContext = () => {
  // DataDisplayModelContext is used here to force ourselves to check the
  // type of the context on the next line
  const context = useContext(DataDisplayModelContext)
  if (!context || !isGraphContentModel(context)) {
    throw new Error("useGraphContentModelContext must be used within a GraphContentModelContextProvider")
  }
  return context
}
