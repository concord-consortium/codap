import { IDataSet } from "../models/data/data-set"
import { IDataSetMetadata, kDataSetMetadataType, DataSetMetadata } from "../models/shared/data-set-metadata"
import { getSharedModelManager } from "../models/tiles/tile-environment"
import { useDataSetContext } from "./use-data-set-context"

export function useDataSet(inData?: IDataSet, inMetadata?: IDataSetMetadata) {
  const _data = useDataSetContext()
  const data = inData ?? _data
  // find the metadata that corresponds to this DataSet
  const sharedModelManager = getSharedModelManager(data)
  const metadata = inMetadata ?? sharedModelManager
                                  ?.getSharedModelsByType<typeof DataSetMetadata>(kDataSetMetadataType)
                                  .find((model: IDataSetMetadata) => {
                                    return model.data?.id === data?.id
                                  }) as IDataSetMetadata | undefined
  return { data, metadata }
}
