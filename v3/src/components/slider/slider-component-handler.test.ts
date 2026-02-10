import { DIComponentInfo } from "../../data-interactive/data-interactive-types"
import { diComponentHandler } from "../../data-interactive/handlers/component-handler"
import { diGlobalHandler } from "../../data-interactive/handlers/global-handler"
import { appState } from "../../models/app-state"
import { toV3Id } from "../../utilities/codap-utils"
import { isSliderModel } from "./slider-model"
import { kSliderIdPrefix } from "./slider-registration"
import { IDocumentContentModel } from "../../models/document/document-content"
import { Logger } from "../../lib/logger"
import { testGetComponent } from "../../data-interactive/handlers/component-handler-test-utils"
import { getSnapshot } from "mobx-state-tree"
import { kSliderTileType } from "./slider-defs"

// The logger has to be initialized with a document before a new document
// can be created.
Logger.initializeLogger(appState.document)

function createGlobalValue(name: string, value: number) {
  const globalResult = diGlobalHandler.create!({}, {
    type: "global",
    name,
    value,
  })
  expect(globalResult.success).toBe(true)
  return name
}

describe("Slider ComponentHandler", () => {
  const handler = diComponentHandler
  let documentContent: IDocumentContentModel

  beforeEach(async () => {
    // Create a new document
    await appState.setDocument({type: "CODAP"})
    documentContent = appState.document.content!
  })

  test("create slider without a global", () => {
    expect(documentContent.tileMap.size).toBe(0)

    const result = handler.create!({}, { type: "slider" })
    // TODO: is this correct? Without a global value, should the slider be created?
    expect(result.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)

    const resultValues = result.values as DIComponentInfo
    const tile = documentContent.tileMap.get(toV3Id(kSliderIdPrefix, resultValues.id!))!
    expect(tile).toBeDefined()
    expect(isSliderModel(tile.content)).toBe(true)
  })

  test("cannot create slider with a globalValue that doesn't exist", () => {
    expect(documentContent.tileMap.size).toBe(0)

    const result = handler.create!({}, {
      type: "slider",
      globalValueName: "nonexistentGlobalValue",
    })

    expect(result.success).toBe(false)
    if (result.success) {
      throw new Error("Expected result to be unsuccessful")
    }
    expect(result.values!.error).toBeDefined()
    expect(documentContent.tileMap.size).toBe(0)
  })

  test("create slider and check defaults", () => {
    expect(documentContent.tileMap.size).toBe(0)
    const globalValueName = createGlobalValue("testGlobalValue", 1)

    const result = handler.create!({}, {
      type: "slider",
      globalValueName,
    })
    expect(result.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const resultValues = result.values as DIComponentInfo
    const tile = documentContent.tileMap.get(toV3Id(kSliderIdPrefix, resultValues.id!))!
    expect(tile).toBeDefined()
    if (!isSliderModel(tile.content)) {
      throw new Error("Expected tile content to be a slider model")
    }
    const sliderModel = tile.content
    expect(sliderModel.globalValue.name).toBe(globalValueName)
    expect(sliderModel.globalValue.value).toBe(1)

    // Check default values
    const snapshot = getSnapshot(sliderModel)
    expect(snapshot).toMatchObject({
      type: kSliderTileType,
      globalValue: expect.stringMatching(/GLOB.*/),
      axis: {
        min: -0.5,
        max: 11.5,
        place: "bottom",
      },
      animationDirection: "lowToHigh",
      animationMode: "onceOnly",
      scaleType: "numeric",
      dateMultipleOfUnit: "day",
      multipleOf: undefined,
    })
  })

  test("created slider roundtrips with non-default values", () => {
    expect(documentContent.tileMap.size).toBe(0)
    const globalValueName = createGlobalValue("testGlobalValue", 1)

    const sliderCreationObject = {
      type: "slider",
      globalValueName,
      lowerBound: -100,
      upperBound: 100,
      animationDirection: 0,
      animationMode: 0,
      animationRate: 1,
      scaleType: "date",
      dateMultipleOfUnit: "month",
      multipleOf: 1,
    }
    const result = handler.create!({}, sliderCreationObject)
    expect(result.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const resultValues = result.values as DIComponentInfo
    const tile = documentContent.tileMap.get(toV3Id(kSliderIdPrefix, resultValues.id!))!
    expect(tile).toBeDefined()
    const sliderModel = tile.content
    if (!isSliderModel(sliderModel)) {
      throw new Error("Expected tile content to be a slider model")
    }
    expect(sliderModel.globalValue.name).toBe(globalValueName)
    expect(sliderModel.globalValue.value).toBe(1)
    expect(sliderModel.axis.type).toBe("date")
    expect(sliderModel.axis.min).toBe(-100)
    expect(sliderModel.axis.max).toBe(100)
    expect(sliderModel.animationDirection).toBe("backAndForth")
    expect(sliderModel.animationMode).toBe("nonStop")
    expect(sliderModel.animationRate).toBe(1)
    expect(sliderModel.dateMultipleOfUnit).toBe("month")
    expect(sliderModel.multipleOf).toBe(1)
    expect(sliderModel.scaleType).toBe("date")

    testGetComponent(tile, handler, (_ignored, values) => {
      // Check the values are round tripped correctly
      expect(values).toMatchObject(sliderCreationObject)
    })
  })

  test("create slider with invalid values", () => {
    expect(documentContent.tileMap.size).toBe(0)
    const globalValueName = createGlobalValue("testGlobalValue", 1)
    const result = handler.create!({}, {
      type: "slider",
      globalValueName,
      dateMultipleOfUnit: "invalidUnit",
    })
    expect(result.success).toBe(false)
    if (result.success) {
      throw new Error("Expected result to be unsuccessful")
    }
    expect(result.values!.error).toBeDefined()
    expect(documentContent.tileMap.size).toBe(0)

    const result2 = handler.create!({}, {
      type: "slider",
      globalValueName,
      scaleType: "invalidScaleType",
    })
    expect(result2.success).toBe(false)
    if (result2.success) {
      throw new Error("Expected result to be unsuccessful")
    }
    expect(result2.values!.error).toBeDefined()
    expect(documentContent.tileMap.size).toBe(0)

    const result3 = handler.create!({}, {
      type: "slider",
      globalValueName,
      animationDirection: -1,
    })
    expect(result3.success).toBe(false)
    if (result3.success) {
      throw new Error("Expected result to be unsuccessful")
    }
    expect(result3.values!.error).toBeDefined()
    expect(documentContent.tileMap.size).toBe(0)

    const result4 = handler.create!({}, {
      type: "slider",
      globalValueName,
      animationMode: -1,
    })
    expect(result4.success).toBe(false)
    if (result4.success) {
      throw new Error("Expected result to be unsuccessful")
    }
    expect(result4.values!.error).toBeDefined()
    expect(documentContent.tileMap.size).toBe(0)
  })

  test("update slider with most values", () => {
    expect(documentContent.tileMap.size).toBe(0)
    const globalValueName = createGlobalValue("testGlobalValue", 1)
    const result = handler.create!({}, {
      type: "slider",
      globalValueName,
    })
    expect(result.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)

    const resultValues = result.values as DIComponentInfo
    const tile = documentContent.tileMap.get(toV3Id(kSliderIdPrefix, resultValues.id!))!
    expect(tile).toBeDefined()
    const sliderModel = tile.content
    if (!isSliderModel(sliderModel)) {
      throw new Error("Expected tile content to be a slider model")
    }

    const updateResult = handler.update!({ component: tile }, {
      lowerBound: -100,
      upperBound: 100,
      animationDirection: 0,
      animationMode: 0,
      animationRate: 1,
      scaleType: "date",
      dateMultipleOfUnit: "month",
      multipleOf: 1,
    })
    expect(updateResult.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)

    // TODO: check these values
    // const updatedResultValues = updateResult.values as DIComponentInfo

    expect(getSnapshot(sliderModel)).toMatchObject({
      type: kSliderTileType,
      globalValue: expect.stringMatching(/GLOB.*/),
      axis: {
        type: "date",
        min: -100,
        max: 100,
        place: "bottom",
      },
      animationDirection: "backAndForth",
      animationMode: "nonStop",
      scaleType: "date",
      dateMultipleOfUnit: "month",
      multipleOf: 1,
    })
  })

  test("update slider value", () => {
    expect(documentContent.tileMap.size).toBe(0)
    const globalValueName = createGlobalValue("testGlobalValue", 5)
    const result = handler.create!({}, {
      type: "slider",
      globalValueName,
    })
    expect(result.success).toBe(true)
    const resultValues = result.values as DIComponentInfo
    const tile = documentContent.tileMap.get(toV3Id(kSliderIdPrefix, resultValues.id!))!
    expect(tile).toBeDefined()
    const sliderModel = tile.content
    if (!isSliderModel(sliderModel)) {
      throw new Error("Expected tile content to be a slider model")
    }
    expect(sliderModel.globalValue.value).toBe(5)

    // Update the value
    const updateResult = handler.update!({ component: tile }, { value: 10 })
    expect(updateResult.success).toBe(true)
    expect(sliderModel.globalValue.value).toBe(10)

    // Update value along with other properties
    const updateResult2 = handler.update!({ component: tile }, {
      value: 25,
      lowerBound: 0,
      upperBound: 50,
    })
    expect(updateResult2.success).toBe(true)
    expect(sliderModel.globalValue.value).toBe(25)
    expect(sliderModel.axis.min).toBe(0)
    expect(sliderModel.axis.max).toBe(50)

    // Verify get returns the updated value
    const getResult = handler.get!({ component: tile })
    expect(getResult.success).toBe(true)
    expect((getResult.values as any).value).toBe(25)
  })

  test("update slider with a global value", () => {
    expect(documentContent.tileMap.size).toBe(0)
    const globalValueName = createGlobalValue("testGlobalValue", 1)
    const result = handler.create!({}, {
      type: "slider",
      globalValueName,
    })
    expect(result.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const resultValues = result.values as DIComponentInfo
    const tile = documentContent.tileMap.get(toV3Id(kSliderIdPrefix, resultValues.id!))!
    expect(tile).toBeDefined()
    const sliderModel = tile.content
    if (!isSliderModel(sliderModel)) {
      throw new Error("Expected tile content to be a slider model")
    }
    expect(sliderModel.globalValue.name).toBe(globalValueName)
    expect(sliderModel.globalValue.value).toBe(1)

    const newGlobalValueName = createGlobalValue("newTestGlobalValue", 2)
    const updateResult = handler.update!({ component: tile }, {
      globalValueName: newGlobalValueName,
    })
    expect(updateResult.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    expect(sliderModel.globalValue.name).toBe(newGlobalValueName)
    expect(sliderModel.globalValue.value).toBe(2)
  })
  test("update slider without values", () => {
    expect(documentContent.tileMap.size).toBe(0)
    const globalValueName = createGlobalValue("testGlobalValue", 1)
    const sliderCreationObject = {
      type: "slider",
      globalValueName,
      lowerBound: -100,
      upperBound: 100,
      animationDirection: 0,
      animationMode: 0,
      animationRate: 1,
      scaleType: "date",
      dateMultipleOfUnit: "month",
      multipleOf: 1,
    }
    const result = handler.create!({}, sliderCreationObject)
    expect(result.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const resultValues = result.values as DIComponentInfo
    const tile = documentContent.tileMap.get(toV3Id(kSliderIdPrefix, resultValues.id!))!
    expect(tile).toBeDefined()
    const sliderModel = tile.content
    if (!isSliderModel(sliderModel)) {
      throw new Error("Expected tile content to be a slider model")
    }

    const updateResult = handler.update!({ component: tile }, {
      title: "newTitle",
    })
    expect(updateResult.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)

    expect(tile.title).toBe("newTitle")

    const snapshot = getSnapshot(sliderModel)
    expect(snapshot).toMatchObject({
      type: kSliderTileType,
      globalValue: expect.stringMatching(/GLOB.*/),
      axis: {
        type: "date",
        min: -100,
        max: 100,
        place: "bottom",
      },
      animationDirection: "backAndForth",
      animationMode: "nonStop",
      scaleType: "date",
      dateMultipleOfUnit: "month",
      multipleOf: 1,
    })
  })

  test("update slider with a non-existent global value", () => {
    expect(documentContent.tileMap.size).toBe(0)
    const globalValueName = createGlobalValue("testGlobalValue", 1)
    const result = handler.create!({}, {
      type: "slider",
      globalValueName,
    })
    expect(result.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const resultValues = result.values as DIComponentInfo
    const tile = documentContent.tileMap.get(toV3Id(kSliderIdPrefix, resultValues.id!))!
    expect(tile).toBeDefined()
    const sliderModel = tile.content
    if (!isSliderModel(sliderModel)) {
      throw new Error("Expected tile content to be a slider model")
    }
    expect(sliderModel.globalValue.name).toBe(globalValueName)
    expect(sliderModel.globalValue.value).toBe(1)
    const updateResult = handler.update!({ component: tile }, {
      globalValueName: "nonexistentGlobalValue",
    })
    expect(updateResult.success).toBe(false)
    if (updateResult.success) {
      throw new Error("Expected result to be unsuccessful")
    }
    expect(updateResult.values!.error).toBeDefined()
    expect(documentContent.tileMap.size).toBe(1)
    expect(sliderModel.globalValue.name).toBe(globalValueName)
    expect(sliderModel.globalValue.value).toBe(1)
  })

  test("cannot create multiple sliders with the same globalValue", () => {
    expect(documentContent.tileMap.size).toBe(0)
    const globalValueName = createGlobalValue("testGlobalValue", 1)

    const result = handler.create!({}, {
      type: "slider",
      globalValueName,
    })
    expect(result.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)

    const duplicateResult = handler.create!({}, {
      type: "slider",
      globalValueName,
    })
    expect(duplicateResult.success).toBe(false)
    if (duplicateResult.success) {
      throw new Error("Expected result to be unsuccessful")
    }
    expect(duplicateResult.values!.error).toBeDefined()
    expect(documentContent.tileMap.size).toBe(1)
  })

  test("cannot update a slider to have the same globalValue as another slider", () => {
    expect(documentContent.tileMap.size).toBe(0)
    const globalValueName = createGlobalValue("testGlobalValue", 1)
    const result = handler.create!({}, {
      type: "slider",
      globalValueName,
    })
    expect(result.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)

    const globalValueName2 = createGlobalValue("testGlobalValue2", 1)
    const result2 = handler.create!({}, {
      type: "slider",
      globalValueName: globalValueName2,
    })
    expect(result2.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(2)

    const resultValues2 = result2.values as DIComponentInfo
    const tile = documentContent.tileMap.get(toV3Id(kSliderIdPrefix, resultValues2.id!))!
    const result3 = handler.update!({ component: tile }, {
      globalValueName,
    })
    expect(result3.success).toBe(false)
    if (result3.success) {
      throw new Error("Expected result to be unsuccessful")
    }
    expect(result3.values!.error).toBeDefined()
  })


  test("delete slider", () => {
    expect(documentContent.tileMap.size).toBe(0)
    const globalValueName = createGlobalValue("testGlobalValue", 1)

    const result = handler.create!({}, {
      type: "slider",
      globalValueName,
    })
    expect(result.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const resultValues = result.values as DIComponentInfo
    const tile = documentContent.tileMap.get(toV3Id(kSliderIdPrefix, resultValues.id!))!

    const deleteResult = handler.delete!({ component: tile })
    expect(deleteResult.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(0)
  })
})
