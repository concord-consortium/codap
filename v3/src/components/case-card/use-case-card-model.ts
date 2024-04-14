import { createContext, useContext } from "react"
import { ICaseCardModel } from "./case-card-model"

export const CaseCardModelContext = createContext<ICaseCardModel | undefined>(undefined)

export const useCaseCardModel = () => useContext(CaseCardModelContext)
