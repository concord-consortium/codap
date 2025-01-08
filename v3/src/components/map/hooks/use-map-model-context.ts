import { Context, useContext } from "react"
import { IMapContentModel, isMapContentModel } from "../models/map-content-model"
import { DataDisplayModelContext } from "../../data-display/hooks/use-data-display-model"

// MapModelContext and DataDisplayModelContext share the same underlying context
// It is casted here to force users of MapModelContext.Provider to give it
// a IMapContentModel
export const MapModelContext = DataDisplayModelContext as Context<IMapContentModel| undefined>

export const useMapModelContext = () => {
  // DataDisplayModelContext is used here to force ourselves to check the
  // type of the context on the next line
  const context = useContext(DataDisplayModelContext)
  if (!context || !isMapContentModel(context)) {
    throw new Error("useMapModelContext must be used within a MapModelContextProvider")
  }
  return context
}
