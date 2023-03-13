import { createContext, useContext } from "react"
import { ICollectionModel } from "../models/data/collection"

export const CollectionContext = createContext<ICollectionModel | undefined>(undefined)
export const useCollectionContext = () => useContext(CollectionContext)

export const ParentCollectionContext = createContext<ICollectionModel | undefined>(undefined)
export const useParentCollectionContext = () => useContext(ParentCollectionContext)
