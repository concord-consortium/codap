import { getSnapshot } from "mobx-state-tree"
import { DIComponentInfo } from "../../data-interactive/data-interactive-types"
import { diComponentHandler } from "../../data-interactive/handlers/component-handler"
import { Logger } from "../../lib/logger"
import { appState } from "../../models/app-state"
import { IDataSet } from "../../models/data/data-set"
import { IDocumentContentModel } from "../../models/document/document-content"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { toV3Id } from "../../utilities/codap-utils"
import { ISliderModel, isSliderModel } from "./slider-model"
import { kSliderIdPrefix } from "./slider-registration"

// adds a copy of the dataset, values included, to the document and returns the copy
export function addDataSetCopy(content: IDocumentContentModel, source: IDataSet): IDataSet {
  // attribute values are only included in the snapshot while it's prepared
  source.prepareSnapshot()
  const snapshot = getSnapshot(source)
  source.completeSnapshot()
  return content.createDataSet(snapshot).sharedDataSet.dataSet
}

// a fresh document containing the standard test dataset ("data") and a default variable slider
export async function setupSliderAndData() {
  Logger.initializeLogger(appState.document)
  await appState.setDocument({ type: "CODAP" })
  const content: IDocumentContentModel = appState.document.content!
  const { dataset: source } = setupTestDataset()
  const dataSet = addDataSetCopy(content, source)
  const result = diComponentHandler.create!({}, { type: "slider" })
  const tile = content.tileMap.get(toV3Id(kSliderIdPrefix, (result.values as DIComponentInfo).id!))!
  const slider = tile.content as ISliderModel
  if (!isSliderModel(slider)) throw new Error("expected a slider tile")
  return { content, dataSet, tile, slider }
}
