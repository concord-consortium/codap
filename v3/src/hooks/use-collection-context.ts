import { createContext, useContext } from "react"

export const CollectionContext = createContext<string>("")
export const useCollectionContext = () => useContext(CollectionContext)

export const ParentCollectionContext = createContext<string | undefined>(undefined)
export const useParentCollectionContext = () => useContext(ParentCollectionContext)
