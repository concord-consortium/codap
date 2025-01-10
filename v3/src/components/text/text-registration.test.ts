import { textToSlate } from "@concord-consortium/slate-editor"
import { V2Text } from "../../data-interactive/data-interactive-component-types"
import { diComponentHandler } from "../../data-interactive/handlers/component-handler"
import { testGetComponent, testUpdateComponent } from "../../data-interactive/handlers/component-handler-test-utils"
import { appState } from "../../models/app-state"
import { DocumentContentModel } from "../../models/document/document-content"
import { FreeTileRow } from "../../models/document/free-tile-row"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { getTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { CodapV2Document } from "../../v2/codap-v2-document"
import { exportV2Component } from "../../v2/codap-v2-tile-exporters"
import { importV2Component } from "../../v2/codap-v2-tile-importers"
import { ICodapV2DocumentJson, isV2TextComponent, V2SlateExchangeValue } from "../../v2/codap-v2-types"
import { kTextTileType, kV2TextDGType } from "./text-defs"
import { editorValueToModelValue, isTextModel, ITextModel } from "./text-model"
import "./text-registration"

const fs = require("fs")
const path = require("path")

describe("Text registration", () => {
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
    expect((tile!.content as ITextModel).textContent).toBe("This is some simple text.")
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
    expect((tile!.content as ITextModel).textContent).toBe("This is some bold italic underlined deleted red rich text.")
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

  it("exports v2 text components", () => {
    const textContentInfo = getTileContentInfo(kTextTileType)!
    const docContent = DocumentContentModel.create()
    const freeTileRow = FreeTileRow.create()
    docContent.setRowCreator(() => freeTileRow)
    const tile = docContent.insertTileSnapshotInDefaultRow({
      content: textContentInfo?.defaultContent()
    })!
    const output = exportV2Component({ tile, row: freeTileRow })
    expect(output?.type).toBe(kV2TextDGType)
    const textTileOutput = isV2TextComponent(output!) ? output : undefined
    const expectedModelValue = editorValueToModelValue(textToSlate("")) as V2SlateExchangeValue
    expectedModelValue.document.objTypes = { paragraph: "block" }
    const expectedTextOutput = JSON.stringify(expectedModelValue)
    expect(textTileOutput?.componentStorage?.text).toBe(expectedTextOutput)
  })
})

describe("text component handler", () => {
  const documentContent = appState.document.content!
  const diHandler = diComponentHandler

  it("can create an empty text tile and retrieve its contents", () => {
    expect(documentContent.tileMap.size).toBe(0)
    const emptyTextTileResult = diHandler.create!({}, { type: "text" })
    expect(emptyTextTileResult.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const [tileId, tile] = Array.from(documentContent.tileMap.entries())[0]
    expect(isTextModel(tile.content)).toBe(true)
    expect((tile.content as ITextModel).textContent).toBe("")

    testGetComponent(tile, diHandler, (textTile, values) => {
      const { text } = values as V2Text
      expect(isTextModel(textTile.content)).toBe(true)
      const textContent = textTile.content as ITextModel
      expect(textContent.value).toBe(text)
    })

    documentContent.deleteTile(tileId)
    expect(documentContent.tileMap.size).toBe(0)
  })

  it("can create a text tile with default text content and retrieve its contents", () => {
    expect(documentContent.tileMap.size).toBe(0)
    // creating empty text tile
    const emptyTextTileResult = diHandler.create!({}, { type: "text", text: "To be, or not to be" })
    expect(emptyTextTileResult.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const [tileId, tile] = Array.from(documentContent.tileMap.entries())[0]
    expect(isTextModel(tile.content)).toBe(true)
    expect((tile.content as ITextModel).textContent).toBe("To be, or not to be")

    testGetComponent(tile, diHandler, (textTile, values) => {
      const { text } = values as V2Text
      expect(isTextModel(textTile.content)).toBe(true)
      const textContent = textTile.content as ITextModel
      expect(textContent.value).toBe(text)
    })

    const newValues: Partial<V2Text> = { text: "To be, or not to be, that is the question." }
    testUpdateComponent(tile, diHandler, newValues, (textTile, values) => {
      expect(isTextModel(tile.content)).toBe(true)
      expect((tile.content as ITextModel).textContent).toBe(newValues.text)
    })

    documentContent.deleteTile(tileId)
    expect(documentContent.tileMap.size).toBe(0)
  })

  it("can create and then update a text tile with slate type text content and retrieve its contents", () => {
    expect(documentContent.tileMap.size).toBe(0)
    // creating empty text tile
    const emptyTextTileResult = diHandler.create!({}, {
      type: "text",
      text: {
        object: "value",
        document: {
          children: [{
            type: "paragraph",
            children: [{
              text: "To be, or not to be"
            }]
          }]
        }
      }
    })
    expect(emptyTextTileResult.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const [tileId, tile] = Array.from(documentContent.tileMap.entries())[0]
    expect(isTextModel(tile.content)).toBe(true)
    expect((tile.content as ITextModel).textContent).toBe("To be, or not to be")

    testGetComponent(tile, diHandler, (textTile, values) => {
      const { text } = values as V2Text
      expect(isTextModel(textTile.content)).toBe(true)
      const textContent = textTile.content as ITextModel
      expect(textContent.value).toBe(text)
    })

    const newValues: Partial<V2Text> = {
      text: {
        object: "value",
        document: {
          children: [{
            type: "paragraph",
            children: [{
              text: "To be, or not to be, that is the question."
            }]
          }]
        }
      }
    }
    testUpdateComponent(tile, diHandler, newValues, (textTile, values) => {
      expect(isTextModel(tile.content)).toBe(true)
      expect((tile.content as ITextModel).textContent).toBe("To be, or not to be, that is the question.")
    })

    documentContent.deleteTile(tileId)
    expect(documentContent.tileMap.size).toBe(0)
  })
})
