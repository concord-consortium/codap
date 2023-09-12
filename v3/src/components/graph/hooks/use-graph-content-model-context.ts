import { createContext, useContext } from "react"
import { IGraphContentModel } from "../models/graph-content-model"

const kDefaultGraphContentModel = {
  getAxis: () => undefined,
  getNumericAxis: () => undefined
} as unknown as IGraphContentModel

export const GraphContentModelContext = createContext<IGraphContentModel>(kDefaultGraphContentModel)

export const useGraphContentModelContext = () => useContext(GraphContentModelContext)
