import { kCalculatorTileType } from "../../components/calculator/calculator-defs"
import { kCaseTableTileType } from "../../components/case-table/case-table-defs"
import { kDataSummaryTileType } from "../../components/data-summary/data-summary-defs"
import { kGraphTileType } from "../../components/graph/graph-defs"
import { kHelloCodapTileType } from "../../components/hello/hello-defs"
import { kSliderTileType } from "../../components/slider/slider-defs"
import { urlParams } from "../../utilities/url-params"
import { getTileContentInfo } from "../tiles/tile-content-info"
import { TileModel } from "../tiles/tile-model"
import { createDocumentModel } from "../document/create-document-model"
import { IDocumentModel, IDocumentModelSnapshot } from "../document/document"
import { DocumentContentModel } from "../document/document-content"
import { FreeTileRow, IFreeTileInRowOptions } from "../document/free-tile-row"
import { IMosaicTileInRowOptions, isMosaicTileRow, MosaicTileRow } from "../document/mosaic-tile-row"
import build from "../../../build_number.json"
import pkg from "../../../package.json"
const { version } = pkg
const { buildNumber } = build

export function createCodapDocument(snapshot?: IDocumentModelSnapshot): IDocumentModel {
  const document = createDocumentModel({ type: "CODAP", version, build: `${buildNumber}`, ...snapshot })
  if (!document.content) {
    document.setContent(DocumentContentModel.create() as any)
  }
  if (document.content?.rowCount === 0) {
    const isFreeLayout = urlParams.layout === "free"
    // CODAP v2/v3 documents have a single "row" containing all tiles/components
    // const rowCreator = () => FreeTileRow.create()
    // But for now we use a mosaic to preserve the current dashboard behavior until
    // we have the ability to create/move components.
    const rowCreator = isFreeLayout
                        ? () => FreeTileRow.create()
                        : () => MosaicTileRow.create()
    const row = rowCreator()
    document.content.setRowCreator(rowCreator)
    document.content.insertRow(row)
    document.content.setVisibleRows([row.id])
  }
  return document
}

// start with an empty document
let gCurrentDocument = createCodapDocument()

export function getCurrentDocument() {
  return gCurrentDocument
}

export function setCurrentDocument(snapshot?: IDocumentModelSnapshot) {
  gCurrentDocument = createCodapDocument(snapshot)
}

type ILayoutOptions = IFreeTileInRowOptions | IMosaicTileInRowOptions | undefined

export function createDefaultTileOfType(tileType: string) {
  const info = getTileContentInfo(tileType)
  const content = info?.defaultContent()
  return content ? TileModel.create({ content }) : undefined
}

// TODO: Eliminate (or hide behind a URL parameter) default dashboard content
export function addDefaultComponents() {
  const content = gCurrentDocument.content
  if (!content) return

  const row = content.getRowByIndex(0)
  if (!row) return

  const kFullWidth = 580
  const kFullHeight = 300
  const kHalfHeight = kFullHeight / 2
  const kGap = 10

  setTimeout(() => {
    const summaryTile = createDefaultTileOfType(kDataSummaryTileType)
    if (!summaryTile) return
    const summaryOptions: ILayoutOptions = isMosaicTileRow(row)
            ? undefined
            : { x: 2, y: 2, width: kFullWidth, height: kFullHeight }
    content.insertTileInRow(summaryTile, row, summaryOptions)

    const tableTile = createDefaultTileOfType(kCaseTableTileType)
    if (!tableTile) return
    const tableOptions: ILayoutOptions = isMosaicTileRow(row)
            ? { splitTileId: summaryTile.id, direction: "column" }
            : { x: 2, y: kFullHeight + kGap, width: kFullWidth, height: kFullHeight }
    content.insertTileInRow(tableTile, row, tableOptions)

    const helloTile = createDefaultTileOfType(kHelloCodapTileType)
    if (!helloTile) return
    const helloOptions = isMosaicTileRow(row)
            ? { splitTileId: summaryTile.id, direction: "row" }
            : { x: kFullWidth + kGap, y: 2, width: kFullWidth, height: kHalfHeight }
    content.insertTileInRow(helloTile, row, helloOptions)

    const sliderTile = createDefaultTileOfType(kSliderTileType)
    if (sliderTile) {
      const sliderOptions = isMosaicTileRow(row)
              ? { splitTileId: helloTile.id, direction: "column" }
              : { x: kFullWidth + kGap, y: kHalfHeight + kGap / 2, width: kFullWidth, height: kHalfHeight }
      content.insertTileInRow(sliderTile, row, sliderOptions)
    }

    const graphTile = createDefaultTileOfType(kGraphTileType)
    if (graphTile) {
      const graphOptions = isMosaicTileRow(row)
              ? { splitTileId: tableTile.id, direction: "row" }
              : { x: kFullWidth + kGap, y: kFullHeight + kGap, width: kFullWidth, height: kFullHeight }
      content.insertTileInRow(graphTile, row, graphOptions)
    }

    const calculatorTile = createDefaultTileOfType(kCalculatorTileType)
    if (calculatorTile) {
      const calcOptions = isMosaicTileRow(row)
              ? { splitTileId: helloTile.id, direction: "column" }
              : { x: kFullWidth + kGap, y: 50, width: 127, height: 155 }
      content.insertTileInRow(calculatorTile, row, calcOptions)
    }
  })
}
