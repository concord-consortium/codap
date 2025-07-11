import { createContext, useContext } from "react"
import { IDataSet } from "../models/data/data-set"

export const DataSetContext = createContext<IDataSet | undefined>(undefined)

/**
 * In some cases this context is used where a dataset is not available right
 * away. So undefined needs to be handled.
 *
 * @returns a dataset or undefined.
 */
export const useDataSetContext = () => {
  return useContext(DataSetContext)
}
