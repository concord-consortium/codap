import { CaseTableModel } from "../../components/case-table/case-table-model"
import { DataSummaryModel } from "../../components/data-summary/data-summary-model"
import { GraphModel } from "../../components/graph/models/graph-model"
import { HelloCodapModel } from "../../components/hello/hello-model"
import { SliderModel } from "../../components/slider/slider-model"
import { urlParams } from "../../utilities/url-params"
import { TileModel } from "../tiles/tile-model"
import { createDocumentModel } from "./create-document-model"
import { IDocumentModel, IDocumentModelSnapshot } from "./document"
import { DocumentContentModel } from "./document-content"
import { FreeTileRow, IFreeTileInRowOptions } from "./free-tile-row"
import { IMosaicTileInRowOptions, isMosaicTileRow, MosaicTileRow } from "./mosaic-tile-row"

export function createCodapDocument(snapshot?: IDocumentModelSnapshot): IDocumentModel {
  const document = createDocumentModel({ type: "CODAP", ...snapshot })
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
    const summaryTile = TileModel.create({ content: DataSummaryModel.create() })
    const summaryOptions: ILayoutOptions = isMosaicTileRow(row)
            ? undefined
            : { x: 2, y: 2, width: kFullWidth, height: kFullHeight }
    content.insertTileInRow(summaryTile, row, summaryOptions)

    const tableTile = TileModel.create({ content: CaseTableModel.create() })
    const tableOptions: ILayoutOptions = isMosaicTileRow(row)
            ? { splitTileId: summaryTile.id, direction: "column" }
            : { x: 2, y: kFullHeight + kGap, width: kFullWidth, height: kFullHeight }
    content.insertTileInRow(tableTile, row, tableOptions)

    const helloTile = TileModel.create({ content: HelloCodapModel.create() })
    const helloOptions = isMosaicTileRow(row)
            ? { splitTileId: summaryTile.id, direction: "row" }
            : { x: kFullWidth + kGap, y: 2, width: kFullWidth, height: kHalfHeight }
    content.insertTileInRow(helloTile, row, helloOptions)

    const sliderTile = TileModel.create({ content: SliderModel.create() })
    const sliderOptions = isMosaicTileRow(row)
            ? { splitTileId: helloTile.id, direction: "column" }
            : { x: kFullWidth + kGap, y: kHalfHeight + kGap / 2, width: kFullWidth, height: kHalfHeight }
    content.insertTileInRow(sliderTile, row, sliderOptions)

    const graphTile = TileModel.create({ content: GraphModel.create() })
    const graphOptions = isMosaicTileRow(row)
            ? { splitTileId: tableTile.id, direction: "row" }
            : { x: kFullWidth + kGap, y: kFullHeight + kGap, width: kFullWidth, height: kFullHeight }
    content.insertTileInRow(graphTile, row, graphOptions)
  })
}
