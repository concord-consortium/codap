import { createContext, useContext } from "react"
import { IDataSet } from "../data-model/data-set"

export const DataSetContext = createContext<IDataSet | undefined>(undefined)

export const useDataSetContext = () => {
  return useContext(DataSetContext)
}
