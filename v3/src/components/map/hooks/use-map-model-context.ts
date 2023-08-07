import { createContext, useContext } from "react"
import { IMapContentModel } from "../models/map-content-model"

export const MapModelContext = createContext<IMapContentModel>({} as IMapContentModel)

export const useMapModelContext = () => useContext(MapModelContext)
