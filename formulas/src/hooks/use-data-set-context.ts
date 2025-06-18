import { createContext, useContext } from "react"
import { IDataSet } from "../models/data/data-set"

export const DataSetContext = createContext<IDataSet | undefined>(undefined)

export const useDataSetContext = () => {
  return useContext(DataSetContext)
}
