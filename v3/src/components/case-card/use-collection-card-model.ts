import { useCollectionContext } from "../../hooks/use-collection-context"
import { useCaseCardModel } from "./use-case-card-model"

export function useCollectionCardModel(collectionId?: string) {
  const cardModel = useCaseCardModel()
  const collectionIdFromContext = useCollectionContext()
  return cardModel?.getCollectionCardModel(collectionId ?? collectionIdFromContext)
}
