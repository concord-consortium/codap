import { useContext } from "react"
import { IMapContentModel } from "../models/map-content-model"
import { DataDisplayModelContext } from "../../data-display/hooks/use-data-display-model"

export const MapModelContext = DataDisplayModelContext

export const useMapModelContext = () => useContext(MapModelContext) as IMapContentModel
