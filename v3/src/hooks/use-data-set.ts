import { getEnv } from "mobx-state-tree"
import { IDataSet } from "../models/data/data-set"
import { ISharedCaseMetadata, kSharedCaseMetadataType } from "../models/shared/shared-case-metadata"
import { ITileEnvironment } from "../models/tiles/tile-content"
import { useDataSetContext } from "./use-data-set-context"

export function useDataSet(inData?: IDataSet, inMetadata?: ISharedCaseMetadata) {
  const _data = useDataSetContext()
  const data = inData ?? _data
  // find the metadata that corresponds to this DataSet
  const env: ITileEnvironment | undefined = data ? getEnv(data) : undefined
  const metadata = inMetadata ?? env?.sharedModelManager
                                  ?.getSharedModelsByType(kSharedCaseMetadataType)
                                  .find((model: ISharedCaseMetadata) => {
                                    return model.data?.id === data?.id
                                  }) as ISharedCaseMetadata | undefined
  return { data, metadata }
}
