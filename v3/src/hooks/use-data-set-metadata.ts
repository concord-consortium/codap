import { createContext, useContext } from "react"
import { IDataSetMetadata } from "../models/shared/data-set-metadata"

export const DataSetMetadataContext = createContext<IDataSetMetadata | undefined>(undefined)

export const useDataSetMetadata = () => useContext(DataSetMetadataContext)
