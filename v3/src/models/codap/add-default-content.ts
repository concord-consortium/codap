import { kCalculatorTileType } from "../../components/calculator/calculator-defs"
import { kCaseTableTileType } from "../../components/case-table/case-table-defs"
import { kGraphTileType } from "../../components/graph/graph-defs"
import { isGraphContentModel } from "../../components/graph/models/graph-content-model"
import { kSliderTileType } from "../../components/slider/slider-defs"
import { typedId } from "../../utilities/js-utils"
import { urlParams } from "../../utilities/url-params"
import { appState } from "../app-state"
import { IFreeTileInRowOptions } from "../document/free-tile-row"
import { IMosaicTileInRowOptions, isMosaicTileRow } from "../document/mosaic-tile-row"
import { SharedCaseMetadata } from "../shared/shared-case-metadata"
import { SharedDataSet } from "../shared/shared-data-set"
import { getTileContentInfo } from "../tiles/tile-content-info"
import { getSharedModelManager, getTileEnvironment } from "../tiles/tile-environment"
import { TileModel } from "../tiles/tile-model"

const isTableOnly = urlParams.tableOnly !== undefined

type ILayoutOptions = IFreeTileInRowOptions | IMosaicTileInRowOptions | undefined

export function createDefaultTileOfType(tileType: string) {
  const env = getTileEnvironment(appState.document)
  const info = getTileContentInfo(tileType)
  const id = typedId(info?.prefix || "TILE")
  const content = info?.defaultContent({ env })
  return content ? TileModel.create({ id, content }) : undefined
}

export function addDefaultComponents() {
  const content = appState.document.content
  const manager = getSharedModelManager(appState.document)

  if (!content) return

  const row = content.getRowByIndex(0)
  if (!row) return

  const kFullWidth = 580
  const kWidth25 = kFullWidth / 4
  const kWidth75 = kFullWidth * 3 / 4
  const kFullHeight = 300
  const kGap = 10

  const sharedData = manager?.findFirstSharedModelByType<typeof SharedDataSet>(SharedDataSet)
  const caseMetadata = manager?.findFirstSharedModelByType<typeof SharedCaseMetadata>(SharedCaseMetadata)
  if (isTableOnly) {
    const tableTile = createDefaultTileOfType(kCaseTableTileType)
    if (!tableTile) return
    const tableOptions: ILayoutOptions = isMosaicTileRow(row)
            ? undefined
            : { x: 2, y: 2, width: 800, height: 500 }
    content.insertTileInRow(tableTile, row, tableOptions)
    sharedData && manager?.addTileSharedModel(tableTile.content, sharedData, true)
    caseMetadata && manager?.addTileSharedModel(tableTile.content, caseMetadata, true)
    caseMetadata?.setCaseTableTileId(tableTile.id)
  }
  else {
    const tableTile = createDefaultTileOfType(kCaseTableTileType)
    if (!tableTile) return
    const tableOptions: ILayoutOptions = isMosaicTileRow(row)
            ? undefined
            : { x: 2, y: 2, width: kFullWidth, height: kFullHeight }
    content.insertTileInRow(tableTile, row, tableOptions)
    sharedData && manager?.addTileSharedModel(tableTile.content, sharedData)
    caseMetadata && manager?.addTileSharedModel(tableTile.content, caseMetadata)
    caseMetadata?.setCaseTableTileId(tableTile.id)

    const calculatorTile = createDefaultTileOfType(kCalculatorTileType)
    if (!calculatorTile) return
    if (calculatorTile) {
      const calcOptions = isMosaicTileRow(row)
              ? { splitTileId: tableTile.id, direction: "row" }
              : { x: kFullWidth + kGap, y: 2 }
      content.insertTileInRow(calculatorTile, row, calcOptions)
    }

    const sliderTile = createDefaultTileOfType(kSliderTileType)
    if (sliderTile) {
      const sliderOptions = isMosaicTileRow(row)
              ? { splitTileId: calculatorTile.id, direction: "row" }
              : { x: kFullWidth + kWidth25 + kGap, y: 2, width: kWidth75 }
      content.insertTileInRow(sliderTile, row, sliderOptions)
    }

    const graphTile = createDefaultTileOfType(kGraphTileType)
    if (graphTile) {
      const graphOptions = isMosaicTileRow(row)
              ? { splitTileId: tableTile.id, direction: "row" }
              : { x: 2, y: kFullHeight + kGap, width: kFullWidth, height: kFullHeight }
      content.insertTileInRow(graphTile, row, graphOptions)
      if (isGraphContentModel(graphTile.content)) {
        const dataConfiguration = graphTile.content.layers[0]?.dataConfiguration
        dataConfiguration.setDataset(sharedData?.dataSet, caseMetadata)
      }
    }
  }
}
