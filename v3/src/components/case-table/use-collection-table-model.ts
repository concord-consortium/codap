import { useEffect, useRef } from "react"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { CollectionTableModel } from "./collection-table-model"
import { useCaseTableModel } from "./use-case-table-model"

export function useCollectionTableModel(collectionId?: string) {
  const tableModel = useCaseTableModel()
  const collection = useCollectionContext()
  const collectionTableModel = useRef<CollectionTableModel | undefined>()

  useEffect(() => {
    if (!collectionTableModel.current) {
      collectionTableModel.current = tableModel?.getCollectionTableModel(collectionId ?? collection.id)
    }
  })

  return collectionTableModel.current
}
