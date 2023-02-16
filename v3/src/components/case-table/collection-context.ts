import { createContext, useContext } from "react"
import { ICollectionModel } from "../../models/data/collection"

export const CollectionContext = createContext<ICollectionModel | undefined>(undefined)

export const useCollectionContext = () => useContext(CollectionContext)
