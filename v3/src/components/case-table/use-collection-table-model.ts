import { useCollectionContext } from "../../hooks/use-collection-context"
import { useCaseTableModel } from "./use-case-table-model"

export function useCollectionTableModel(collectionId?: string) {
  const tableModel = useCaseTableModel()
  const collectionIdFromContext = useCollectionContext()
  return tableModel?.getCollectionTableModel(collectionId ?? collectionIdFromContext)
}
