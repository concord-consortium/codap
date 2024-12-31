import { getSnapshot } from "mobx-state-tree"
import { createCodapDocument } from "../../models/codap/create-codap-document"
import { FreeTileRow, IFreeTileRow } from "../../models/document/free-tile-row"
import { GlobalValue, IGlobalValueSnapshot } from "../../models/global/global-value"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { getTileContentInfo } from "../../models/tiles/tile-content-info"
import { getGlobalValueManager, getSharedModelManager } from "../../models/tiles/tile-environment"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { toV2Id } from "../../utilities/codap-utils"
import { CodapV2Document } from "../../v2/codap-v2-document"
import { exportV2Component } from "../../v2/codap-v2-tile-exporters"
import { importV2Component } from "../../v2/codap-v2-tile-importers"
import { ICodapV2DocumentJson, ICodapV2SliderStorage } from "../../v2/codap-v2-types"
import { kSliderTileType } from "./slider-defs"
import { isSliderModel } from "./slider-model"
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
  it("imports/exports v2 slider components", () => {
    const file = path.join(__dirname, "../../test/v2", "slider.codap")
    const sliderJson = fs.readFileSync(file, "utf8")
    const sliderDoc = JSON.parse(sliderJson) as ICodapV2DocumentJson
    const v2Document = new CodapV2Document(sliderDoc)
    const codapDoc = createCodapDocument()
    const docContent = codapDoc.content!
    docContent.setRowCreator(() => FreeTileRow.create())
    const sharedModelManager = getSharedModelManager(docContent)
    const globalValueManager = getGlobalValueManager(sharedModelManager)
    const mockInsertTile = jest.fn((tileSnap: ITileModelSnapshotIn) => {
      return docContent?.insertTileSnapshotInDefaultRow(tileSnap)
    })

    const [sliderComponent] = v2Document.components
    expect(sliderComponent.type).toBe("DG.SliderView")

    const tile = importV2Component({
      v2Component: sliderComponent,
      v2Document,
      sharedModelManager,
      insertTile: mockInsertTile
    })!
    expect(tile).toBeDefined()
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    expect(globalValueManager?.globals.size).toBe(1)
    const globalValue = Object.values(getSnapshot(globalValueManager!.globals))[0]

    const sliderModel = isSliderModel(tile.content) ? tile.content : undefined
    expect(sliderModel).toBeDefined()
    expect(sliderModel?.name).toBe(globalValue.name)
    expect(sliderModel?.value).toBeCloseTo(globalValue._value)
    expect(sliderModel?.animationDirection).toBe("lowToHigh")
    expect(sliderModel?.animationMode).toBe("onceOnly")
    expect(sliderModel?._animationRate).toBeUndefined()
    expect(sliderModel?.multipleOf).toBeUndefined()

    const tileWithInvalidDocument = importV2Component({
      v2Component: {} as any,
      v2Document,
      insertTile: mockInsertTile
    })
    expect(tileWithInvalidDocument).toBeUndefined()

    const tileWithNoSharedModel = importV2Component({
      v2Component: sliderComponent,
      v2Document,
      insertTile: mockInsertTile
    })
    expect(tileWithNoSharedModel).toBeUndefined()

    // export numeric slider in v2 format
    const row = docContent.getRowByIndex(0) as IFreeTileRow
    const sliderExport = exportV2Component({ tile, row, sharedModelManager })
    expect(sliderExport?.type).toBe("DG.SliderView")
    const sliderStorage = sliderExport!.componentStorage as ICodapV2SliderStorage
    expect(sliderStorage._links_?.model).toEqual({
      type: "DG.GlobalValue",
      id: toV2Id(globalValue.id)
    })
    expect(sliderStorage.name).toBe(globalValue.name)
    expect(sliderStorage.animationDirection).toBe(1)
    expect(sliderStorage.animationMode).toBe(1)
    expect(sliderStorage.maxPerSecond).toBeNull()
    expect(sliderStorage.restrictToMultiplesOf).toBeNull()

    // change to date-time slider and export in v2 format
    sliderModel!.setScaleType("date")
    sliderModel!.setDateMultipleOfUnit("day")
    const dateSliderExport = exportV2Component({ tile, row, sharedModelManager })
    expect(dateSliderExport?.type).toBe("DG.SliderView")
    const dateSliderStorage = dateSliderExport!.componentStorage as ICodapV2SliderStorage
    expect(dateSliderStorage._links_?.model).toBeDefined()
    expect(dateSliderStorage.animationDirection).toBe(1)
    expect(dateSliderStorage.animationMode).toBe(1)
    expect(dateSliderStorage.maxPerSecond).toBeNull()
    expect(dateSliderStorage.restrictToMultiplesOf).toBeNull()
    expect(dateSliderStorage.v3?.scaleType).toBe("date")
    expect(dateSliderStorage.v3?.dateMultipleOfUnit).toBe("day")
  })
})
