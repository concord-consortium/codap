import { destroy, types } from "mobx-state-tree"
import { GlobalValue, IGlobalValue } from "../../models/global/global-value"
import { isSliderModel, SliderModel } from "./slider-model"
import { kDefaultAnimationDirection, kDefaultAnimationMode, kDefaultAnimationRate } from "./slider-types"

describe("SliderModel", () => {
  const mockSharedModelManagerWithoutGlobalValueManager = {
    isReady: true,
    addTileSharedModel: () => null,
    getSharedModelsByType: () => []
  }
  const mockSharedModelManager = {
    removeValue: () => null
  }
  const mockSharedModelManagerWithGlobalValueManager = {
    ...mockSharedModelManagerWithoutGlobalValueManager,
    getSharedModelsByType: () => [mockSharedModelManager]
  }
  const Tree = types.model("Tree", {
    globalValue: GlobalValue,
    sliderModel: SliderModel
  })
  let g1: IGlobalValue

  beforeEach(() => {
    g1 = GlobalValue.create({ name: "g1", value: 0 })
  })

  it("works as expected with a shared model manager with a global value manager", () => {
    const tree = Tree.create({
      globalValue: g1,
      sliderModel: { globalValue: g1.id }
    }, { sharedModelManager: mockSharedModelManagerWithGlobalValueManager })
    const slider = tree.sliderModel

    expect(isSliderModel()).toBe(false)
    expect(isSliderModel(slider)).toBe(true)
    expect(slider.name).toBe("g1")
    slider.setName("foo")
    expect(slider.name).toBe("foo")
    expect(slider.value).toBe(0)
    slider.setValue(1)
    expect(slider.value).toBe(1)
    expect(slider.domain).toEqual([slider.axis.min, slider.axis.max])
    expect(slider.increment).toBeCloseTo(0.1)
    slider.setMultipleOf(2)
    slider.setValue(2.5)
    expect(slider.value).toBe(2)
    expect(slider.increment).toBe(2)
    expect(slider.animationDirection).toBe(kDefaultAnimationDirection)
    slider.setAnimationDirection("backAndForth")
    expect(slider.animationDirection).toBe("backAndForth")
    expect(slider.animationMode).toBe(kDefaultAnimationMode)
    slider.setAnimationMode("nonStop")
    expect(slider.animationMode).toBe("nonStop")
    expect(slider.animationRate).toBe(kDefaultAnimationRate)
    slider.setAnimationRate(60)
    expect(slider.animationRate).toBe(60)
    slider.setAnimationRate(kDefaultAnimationRate)
    expect(slider._animationRate).toBeUndefined()

    destroy(tree)
  })

  it("works as expected with a shared model manager without a global value manager", () => {
    const tree = Tree.create({
      globalValue: g1,
      sliderModel: { globalValue: g1.id }
    }, { sharedModelManager: mockSharedModelManagerWithoutGlobalValueManager })
    const slider = tree.sliderModel
    expect(isSliderModel()).toBe(false)
    expect(isSliderModel(slider)).toBe(true)
    destroy(tree)
  })

  it("works as expected without a shared model manager", () => {
    const tree = Tree.create({
      globalValue: g1,
      sliderModel: { globalValue: g1.id }
    })
    const slider = tree.sliderModel
    expect(isSliderModel()).toBe(false)
    expect(isSliderModel(slider)).toBe(true)
    destroy(tree)
  })

})
