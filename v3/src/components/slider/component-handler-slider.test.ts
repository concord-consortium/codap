import { V2GetSlider } from "../../data-interactive/data-interactive-component-types"
import { DIComponentInfo } from "../../data-interactive/data-interactive-types"
import { diComponentHandler } from "../../data-interactive/handlers/component-handler"
import { testGetComponent } from "../../data-interactive/handlers/component-handler-test-utils"
import { appState } from "../../models/app-state"
import { getGlobalValueManager, getSharedModelManager } from "../../models/tiles/tile-environment"
import { toV3Id } from "../../utilities/codap-utils"
import { ISliderModel, isSliderModel } from "./slider-model"
import { kSliderIdPrefix } from "./slider-registration"
import { AnimationDirections, AnimationModes } from "./slider-types"


describe("DataInteractive ComponentHandler Slider", () => {
  const documentContent = appState.document.content!
  const globalManager = getGlobalValueManager(getSharedModelManager(documentContent))
  globalManager?.addValueSnapshot({ name: "global", value: 10 })
  const handler = diComponentHandler

  it("create and get slider work", async () => {
    // Create slider with no value specified
    expect(documentContent.tileMap.size).toBe(0)
    const newValueResult = handler.create!({}, { type: "slider" })
    expect(newValueResult.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const newValueResultValues = newValueResult.values as DIComponentInfo
    const newValueTile = documentContent.tileMap.get(toV3Id(kSliderIdPrefix, newValueResultValues.id!))!
    expect(newValueTile).toBeDefined()
    expect(isSliderModel(newValueTile.content)).toBe(true)

    // Delete slider tile
    const deleteResult = handler.delete!({ component: newValueTile })
    expect(deleteResult.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(0)

    // Create slider with value and other options specified
    const oldValueResult = handler.create!({}, {
      type: "slider", globalValueName: "global", lowerBound: -100, upperBound: 100,
      animationDirection: 0, animationMode: 1
    })
    expect(oldValueResult.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const oldValueResultValues = oldValueResult.values as DIComponentInfo
    const oldValueTile = documentContent.tileMap.get(toV3Id(kSliderIdPrefix, oldValueResultValues.id!))!
    expect(oldValueTile).toBeDefined()
    expect(isSliderModel(oldValueTile.content)).toBe(true)
    const oldValueContent = oldValueTile.content as ISliderModel
    expect(oldValueContent.globalValue.name).toBe("global")
    expect(oldValueContent.axis.min).toBe(-100)
    expect(oldValueContent.axis.max).toBe(100)
    expect(oldValueContent.animationDirection).toBe(AnimationDirections[0])
    expect(oldValueContent.animationMode).toBe(AnimationModes[1])

    // Get slider
    testGetComponent(oldValueTile, handler, (sliderTile, values) => {
      const {
        animationDirection, animationMode, globalValueName, lowerBound, upperBound, value
      } = values as V2GetSlider
      const sliderContent = sliderTile.content as ISliderModel
      expect(animationDirection).toBe(AnimationDirections.findIndex(v => v === sliderContent.animationDirection))
      expect(animationMode).toBe(AnimationModes.findIndex(v => v === sliderContent.animationMode))
      expect(globalValueName).toBe(sliderContent.globalValue.name)
      expect(lowerBound).toBe(sliderContent.axis.min)
      expect(upperBound).toBe(sliderContent.axis.max)
      expect(value).toBe(sliderContent.globalValue.value)
    })

    // Cannot create slider with duplicate global value
    const duplicateResult = handler.create!({}, { type: "slider", globalValueName: "global" })
    expect(duplicateResult.success).toBe(false)
    expect(documentContent.tileMap.size).toBe(1)

    // Cannot create slider with global value that hasn't been defined
    const noValueResult = handler.create!({}, { type: "slider", globalValueName: "noGlobal" })
    expect(noValueResult.success).toBe(false)
    expect(documentContent.tileMap.size).toBe(1)
  })
})
