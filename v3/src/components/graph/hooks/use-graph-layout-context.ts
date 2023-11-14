import { useContext } from "react"
import { DataDisplayLayoutContext } from "../../data-display/hooks/use-data-display-layout"
import { GraphLayout } from "../models/graph-layout"

export const GraphLayoutContext = DataDisplayLayoutContext

export const useGraphLayoutContext = () => {
  const layout = useContext(GraphLayoutContext)
  return layout as GraphLayout
}
