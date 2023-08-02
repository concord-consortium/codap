import { createContext, useContext } from "react"
import { IMapContentModel } from "../models/map-content-model"

export const MapContentModelContext = createContext<IMapContentModel>({} as IMapContentModel)

export const useMapContentModelContext = () => useContext(MapContentModelContext)
