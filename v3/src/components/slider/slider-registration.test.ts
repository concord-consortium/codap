import { DocumentContentModel } from "../../models/document/document-content"
import { FreeTileRow } from "../../models/document/free-tile-row"
import { GlobalValue, IGlobalValueSnapshot } from "../../models/global/global-value"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { getTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { CodapV2Document } from "../../v2/codap-v2-document"
import { importV2Component } from "../../v2/codap-v2-tile-importers"
import { ICodapV2DocumentJson } from "../../v2/codap-v2-types"
import { kSliderTileType } from "./slider-defs"
import "./slider-registration"

const fs = require("fs")
const path = require("path")

describe("Slider registration", () => {
  it("registers content and component info", () => {
    const sliderContentInfo = getTileContentInfo(kSliderTileType)
    expect(sliderContentInfo).toBeDefined()
    expect(getTileComponentInfo(kSliderTileType)).toBeDefined()
    const mockGlobalValueManager = {
      addValueSnapshot: jest.fn((snap: IGlobalValueSnapshot) => GlobalValue.create(snap)),
      uniqueName: jest.fn(() => "v1")
    }
    const mockSharedModelManager = {
      addTileSharedModel: jest.fn(),
      getSharedModelsByType: () => [mockGlobalValueManager]
    }
    const slider = sliderContentInfo?.defaultContent({
      env: {
        sharedModelManager: mockSharedModelManager as any
      }
    })
    expect(slider).toBeDefined()
    expect(mockGlobalValueManager.addValueSnapshot).toHaveBeenCalledTimes(1)
  })
  it("imports v2 slider components", () => {
    const file = path.join(__dirname, "../../test/v2", "slider.codap")
    const sliderJson = fs.readFileSync(file, "utf8")
    const sliderDoc = JSON.parse(sliderJson) as ICodapV2DocumentJson
    const v2Document = new CodapV2Document(sliderDoc)
    const mockGlobalValueManager = {
      addValueSnapshot: jest.fn((snap: IGlobalValueSnapshot) => GlobalValue.create(snap))
    }
    const mockSharedModelManager = {
      addTileSharedModel: jest.fn(),
      getSharedModelsByType: () => [mockGlobalValueManager]
    }

    const docContent = DocumentContentModel.create()
    docContent.setRowCreator(() => FreeTileRow.create())
    const mockInsertTile = jest.fn((tileSnap: ITileModelSnapshotIn) => {
      return docContent?.insertTileSnapshotInDefaultRow(tileSnap)
    })

    const tile = importV2Component({
      v2Component: v2Document.components[0],
      v2Document,
      sharedModelManager: mockSharedModelManager as any,
      insertTile: mockInsertTile
    })
    expect(tile).toBeDefined()
    expect(mockGlobalValueManager.addValueSnapshot).toHaveBeenCalledTimes(1)
    expect(mockSharedModelManager.addTileSharedModel).toHaveBeenCalledTimes(1)
    expect(mockInsertTile).toHaveBeenCalledTimes(1)

    const tileWithInvalidDocument = importV2Component({
      v2Component: {} as any,
      v2Document,
      insertTile: mockInsertTile
    })
    expect(tileWithInvalidDocument).toBeUndefined()

    const tileWithNoSharedModel = importV2Component({
      v2Component: v2Document.components[0],
      v2Document,
      insertTile: mockInsertTile
    })
    expect(tileWithNoSharedModel).toBeUndefined()
  })
})
