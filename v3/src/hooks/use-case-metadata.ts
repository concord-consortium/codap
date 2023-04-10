import { createContext, useContext } from "react"
import { ISharedCaseMetadata } from "../models/shared/shared-case-metadata"

export const CaseMetadataContext = createContext<ISharedCaseMetadata | undefined>(undefined)

export const useCaseMetadata = () => useContext(CaseMetadataContext)
