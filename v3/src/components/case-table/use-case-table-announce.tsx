import { createContext, useContext } from "react"

export const CaseTableAnnounceContext = createContext<(message: string) => void>(() => {})
export const useCaseTableAnnounce = () => useContext(CaseTableAnnounceContext)
