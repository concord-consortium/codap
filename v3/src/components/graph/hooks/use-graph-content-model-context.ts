import { useContext } from "react"
import { IGraphContentModel } from "../models/graph-content-model"
import { DataDisplayModelContext } from "../../data-display/hooks/use-data-display-model"

export const GraphContentModelContext = DataDisplayModelContext

export const useGraphContentModelContext = () => useContext(GraphContentModelContext) as IGraphContentModel
