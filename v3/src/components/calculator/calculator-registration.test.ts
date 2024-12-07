import { DocumentContentModel } from "../../models/document/document-content"
import { FreeTileRow } from "../../models/document/free-tile-row"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { getTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { CodapV2Document } from "../../v2/codap-v2-document"
import { exportV2Component } from "../../v2/codap-v2-tile-exporters"
import { importV2Component } from "../../v2/codap-v2-tile-importers"
import { ICodapV2DocumentJson } from "../../v2/codap-v2-types"
import { kCalculatorTileType, kV2CalculatorDGType } from "./calculator-defs"
import "./calculator-registration"

const fs = require("fs")
const path = require("path")

describe("Calculator registration", () => {
  it("registers content and component info", () => {
    const calculatorContentInfo = getTileContentInfo(kCalculatorTileType)
    expect(calculatorContentInfo).toBeDefined()
    expect(getTileComponentInfo(kCalculatorTileType)).toBeDefined()
    const calculator = calculatorContentInfo?.defaultContent()
    expect(calculator).toBeDefined()
  })

  it("imports v2 calculator components", () => {
    const file = path.join(__dirname, "../../test/v2", "calculator.codap")
    const calculatorJson = fs.readFileSync(file, "utf8")
    const calculatorDoc = JSON.parse(calculatorJson) as ICodapV2DocumentJson
    const v2Document = new CodapV2Document(calculatorDoc)

    const docContent = DocumentContentModel.create()
    docContent.setRowCreator(() => FreeTileRow.create())
    const mockInsertTile = jest.fn((tileSnap: ITileModelSnapshotIn) => {
      return docContent?.insertTileSnapshotInDefaultRow(tileSnap)
    })

    const tile = importV2Component({
      v2Component: v2Document.components[0],
      v2Document,
      insertTile: mockInsertTile
    })
    expect(tile).toBeDefined()
    expect(mockInsertTile).toHaveBeenCalledTimes(1)

    const tileWithInvalidComponent = importV2Component({
      v2Component: {} as any,
      v2Document,
      insertTile: mockInsertTile
    })
    expect(tileWithInvalidComponent).toBeUndefined()
  })

  it("exports v2 calculator components", () => {
    const calculatorContentInfo = getTileContentInfo(kCalculatorTileType)!
    const docContent = DocumentContentModel.create()
    const freeTileRow = FreeTileRow.create()
    docContent.setRowCreator(() => freeTileRow)
    const tile = docContent.insertTileSnapshotInDefaultRow({
      name: calculatorContentInfo?.defaultName?.(),
      content: calculatorContentInfo?.defaultContent()
    })!
    const output = exportV2Component({ tile, row: freeTileRow })
    expect(output?.type).toBe(kV2CalculatorDGType)
    expect(output?.componentStorage?.name).toBe(calculatorContentInfo?.defaultName?.())
  })
})
