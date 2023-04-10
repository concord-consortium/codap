import { createContext, useContext } from "react"
import { ICollectionPropsModel } from "../models/data/collection"

export const CollectionContext = createContext<ICollectionPropsModel>({} as ICollectionPropsModel)
export const useCollectionContext = () => useContext(CollectionContext)

export const ParentCollectionContext = createContext<ICollectionPropsModel | undefined>(undefined)
export const useParentCollectionContext = () => useContext(ParentCollectionContext)
