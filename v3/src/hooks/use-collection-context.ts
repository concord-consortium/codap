import { createContext, useContext } from "react"
import { ICollectionPropsModel } from "../models/data/collection"

import { ICollectionModel } from "../models/data/collection"

export const CollectionContext = createContext<ICollectionModel | undefined>(undefined)
export const useCollectionContext = () => useContext(CollectionContext)

export const ParentCollectionContext = createContext<ICollectionModel | undefined>(undefined)
export const useParentCollectionContext = () => useContext(ParentCollectionContext)
