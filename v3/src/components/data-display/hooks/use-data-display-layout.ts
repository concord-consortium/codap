import { createContext, useContext } from "react"
import { DataDisplayLayout } from "../models/data-display-layout"

export const DataDisplayLayoutContext = createContext<DataDisplayLayout>({} as DataDisplayLayout)

export const useDataDisplayLayout = () => useContext(DataDisplayLayoutContext)
