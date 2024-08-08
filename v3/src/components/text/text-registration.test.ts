import { DocumentContentModel } from "../../models/document/document-content"
import { FreeTileRow } from "../../models/document/free-tile-row"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { getTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { CodapV2Document } from "../../v2/codap-v2-document"
import { importV2Component } from "../../v2/codap-v2-tile-importers"
import { ICodapV2DocumentJson } from "../../v2/codap-v2-types"
import { kTextTileType } from "./text-defs"
import { isTextModel } from "./text-model"
import "./text-registration"

const fs = require("fs")
const path = require("path")

describe("Calculator registration", () => {
  it("registers content and component info", () => {
    const textContentInfo = getTileContentInfo(kTextTileType)
    expect(textContentInfo).toBeDefined()
    expect(getTileComponentInfo(kTextTileType)).toBeDefined()
    const textContent = textContentInfo?.defaultContent()
    expect(textContent).toBeDefined()
  })
  it("imports v2 text components with simple text (legacy v2 format)", () => {
    const file = path.join(__dirname, "../../test/v2", "simple-text.codap")
    const textJson = fs.readFileSync(file, "utf8")
    const textDoc = JSON.parse(textJson) as ICodapV2DocumentJson
    const v2Document = new CodapV2Document(textDoc)

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
    expect(isTextModel(tile!.content)).toBe(true)
    if (tile && isTextModel(tile.content)) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(tile.content.textContent).toBe("This is some simple text.")
    }
  })
  it("imports v2 text components with rich text (newer v2 format)", () => {
    const file = path.join(__dirname, "../../test/v2", "rich-text.codap")
    const textJson = fs.readFileSync(file, "utf8")
    const textDoc = JSON.parse(textJson) as ICodapV2DocumentJson
    const v2Document = new CodapV2Document(textDoc)

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
    expect(isTextModel(tile!.content)).toBe(true)
    if (tile && isTextModel(tile.content)) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(tile.content.textContent).toBe("This is some bold italic underlined deleted red rich text.")
    }
  })
  it("doesn't import invalid v2 text components", () => {
    const file = path.join(__dirname, "../../test/v2", "simple-text.codap")
    const textJson = fs.readFileSync(file, "utf8")
    const textDoc = JSON.parse(textJson) as ICodapV2DocumentJson
    const v2Document = new CodapV2Document(textDoc)

    const docContent = DocumentContentModel.create()
    docContent.setRowCreator(() => FreeTileRow.create())
    const mockInsertTile = jest.fn((tileSnap: ITileModelSnapshotIn) => {
      return docContent?.insertTileSnapshotInDefaultRow(tileSnap)
    })

    const tileWithInvalidComponent = importV2Component({
      v2Component: {} as any,
      v2Document,
      insertTile: mockInsertTile
    })
    expect(tileWithInvalidComponent).toBeUndefined()
  })
})
