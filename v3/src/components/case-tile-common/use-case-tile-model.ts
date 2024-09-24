import { createContext, useContext } from "react"
import { ICaseCardModel } from "../case-card/case-card-model"
import { ICaseTableModel } from "../case-table/case-table-model"

export type CaseTileModelType = ICaseCardModel | ICaseTableModel

export const CaseTileModelContext = createContext<CaseTileModelType | undefined>(undefined)

export const useCaseTileModel = () => useContext(CaseTileModelContext)
