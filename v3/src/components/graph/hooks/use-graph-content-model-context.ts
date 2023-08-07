import { createContext, useContext } from "react"
import { IGraphContentModel } from "../models/graph-content-model"

export const GraphContentModelContext = createContext<IGraphContentModel>({} as IGraphContentModel)

export const useGraphContentModelContext = () => useContext(GraphContentModelContext)
