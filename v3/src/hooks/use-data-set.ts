import { IDataSet } from "../models/data/data-set"
import { ISharedCaseMetadata, kSharedCaseMetadataType } from "../models/shared/shared-case-metadata"
import { getSharedModelManager } from "../models/tiles/tile-environment"
import { useDataSetContext } from "./use-data-set-context"

export function useDataSet(inData?: IDataSet, inMetadata?: ISharedCaseMetadata) {
  const _data = useDataSetContext()
  const data = inData ?? _data
  // find the metadata that corresponds to this DataSet
  const sharedModelManager = getSharedModelManager(data)
  const metadata = inMetadata ?? sharedModelManager
                                  ?.getSharedModelsByType(kSharedCaseMetadataType)
                                  .find((model: ISharedCaseMetadata) => {
                                    return model.data?.id === data?.id
                                  }) as ISharedCaseMetadata | undefined
  return { data, metadata }
}
