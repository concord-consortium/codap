import { useEffect, useRef } from "react"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { CollectionTableModel } from "./collection-table-model"
import { useCaseTableModel } from "./use-case-table-model"

export function useCollectionTableModel(collectionId?: string) {
  const tableModel = useCaseTableModel()
  const collectionIdFromContext = useCollectionContext()
  const collectionTableModel = useRef<CollectionTableModel | undefined>()

  useEffect(() => {
    const isMismatch = collectionTableModel.current?.collectionId !== collectionId
    if (!collectionTableModel.current || isMismatch) {
      collectionTableModel.current = tableModel?.getCollectionTableModel(collectionId ?? collectionIdFromContext)
    }
  })

  return collectionTableModel.current
}
