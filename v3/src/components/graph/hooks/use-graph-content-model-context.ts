import { useContext } from "react"
import { IGraphContentModel } from "../models/graph-content-model"
import { DataDisplayModelContext } from "../../data-display/hooks/use-data-display-model"

// GraphContentModelContext/DataDisplayModelContext share the same underlying context
export const GraphContentModelContext = DataDisplayModelContext

// useGraphContentModelContext casts the result as IGraphContentModel
export const useGraphContentModelContext = () => useContext(GraphContentModelContext) as IGraphContentModel
