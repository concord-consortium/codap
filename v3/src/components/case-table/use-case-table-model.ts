import { createContext, useContext } from "react"
import { ICaseTableModel } from "./case-table-model"

export const CaseTableModelContext = createContext<ICaseTableModel | undefined>(undefined)

export const useCaseTableModel = () => useContext(CaseTableModelContext)
