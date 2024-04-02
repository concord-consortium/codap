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
    expect(slider.globalValueManager).toBeDefined()

    expect(isSliderModel()).toBe(false)
    expect(isSliderModel(slider)).toBe(true)
    expect(slider.name).toBe("g1")
    slider.setName("foo")
    expect(slider.name).toBe("foo")
    expect(slider.value).toBe(0)
    slider.setValue(1)
    expect(slider.value).toBe(1)
    expect(slider.domain).toEqual([slider.axis.min, slider.axis.max])
    expect(slider.increment).toBeCloseTo(0.5)
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
    expect(slider.globalValueManager).toBeUndefined()
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

  it("can update value dynamically (without undo) and then with undo", () => {
    const tree = Tree.create({
      globalValue: g1,
      sliderModel: { globalValue: g1.id }
    })
    const slider = tree.sliderModel
    expect(slider.isUpdatingDynamically).toBe(false)
    const initialValue = slider.value
    const dynamicValue1 = initialValue + 1
    const dynamicValue2 = dynamicValue1 + 1
    const finalValue = dynamicValue2 + 1
    slider.setDynamicValue(dynamicValue1)
    expect(slider.isUpdatingDynamically).toBe(true)
    expect(slider.value).toBe(dynamicValue1)
    expect(slider.globalValue._value).toBe(initialValue)
    slider.setDynamicValueIfDynamic(dynamicValue2)
    expect(slider.value).toBe(dynamicValue2)
    slider.applyUndoableAction(() => slider.setValue(finalValue), {
      undoStringKey: "Undo slider change", redoStringKey: "Redo slider change"
    })
    expect(slider.isUpdatingDynamically).toBe(false)
    expect(slider.value).toBe(finalValue)
    expect(slider.globalValue._value).toBe(finalValue)
    expect(slider.globalValue.value).toBe(finalValue)
    expect(slider.globalValue.dynamicValue).toBeUndefined()
  })

  it("responds to axis domain changes", () => {
    const tree = Tree.create({
      globalValue: g1,
      sliderModel: { globalValue: g1.id }
    })
    const slider = tree.sliderModel
    slider.setAxisMax(20)
    slider.setAxisMin(10)
    expect(slider.value).toBe(10)
    slider.setAxisMin(0)
    slider.setAxisMax(5)
    expect(slider.value).toBe(5)

    expect(slider.validateValue(-1, () => slider.axis.min, () => slider.axis.max)).toBe(0)
    expect(slider.validateValue(3, () => slider.axis.min, () => slider.axis.max)).toBe(3)
    expect(slider.validateValue(6, () => slider.axis.min, () => slider.axis.max)).toBe(5)

    slider.setAxisMax(20)
    slider.setAxisMin(10)
    slider.encompassValue(0)
    expect(slider.axis.min).toBe(-2)
    slider.setAxisMin(10)
    slider.encompassValue(30)
    expect(slider.axis.max).toBe(32)
  })
})
