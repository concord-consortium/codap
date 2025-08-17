import { ITileModel, ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { IDataDisplayContentModel } from "./models/data-display-content-model"


export function v2DataDisplayPostImportSnapshotProcessor(
  tileModel:ITileModel, tileSnap:ITileModelSnapshotIn): ITileModelSnapshotIn
{
  const snapshotContent = tileSnap.content as IDataDisplayContentModel
  const dataDisplayModel = tileModel.content as IDataDisplayContentModel
  dataDisplayModel.layers.forEach((layer, index) => {
    if (snapshotContent.layers[index]) {
      snapshotContent.layers[index].id = layer.id
      snapshotContent.layers[index].dataConfiguration.id = layer.dataConfiguration.id
    }
  })
  return tileSnap
}
