/* eslint-disable testing-library/no-node-access */
import { renderHook } from "@testing-library/react"
import { Instance, types } from "mobx-state-tree"
import React from "react"
import { SliderAxisLayout } from "../../slider/slider-layout"
import { IDataDisplayContentModel } from "../../data-display/models/data-display-content-model"
import { DataDisplayModelContext } from "../../data-display/hooks/use-data-display-model"
import { AxisLayoutContext } from "../models/axis-layout-context"
import { IAxisModel } from "../models/axis-model"
import { IBaseNumericAxisModel } from "../models/base-numeric-axis-models"
import { isAnyNumericAxisModel, NumericAxisModel } from "../models/numeric-axis-models"
import { useAxis } from "./use-axis"
import { AxisProviderContext } from "./use-axis-provider-context"
import { AxisHelper } from "../helper-models/axis-helper"
import { AxisPlace } from "../axis-types"

const TestAxisProvider = types
  .model("TestAxisProvider", {
  axis: NumericAxisModel,
  })
  .actions(self => ({
    getAxisHelper: jest.fn<AxisHelper | undefined, [AxisPlace, subAxisIndex: number]>(), // Mock correct return type
    setAxisHelper: jest.fn<void, [AxisPlace, subAxisIndex: number, AxisHelper]>() // Mock with correct argument types
  }))
  .views(self => ({
    getAxis() {
      return self.axis
    },
    getNumericAxis() {
      return self.axis
    },
    hasBinnedNumericAxis(axisModel: IAxisModel) {
      return false
    },
    hasDraggableNumericAxis(axisModel: IAxisModel) {
      return isAnyNumericAxisModel(axisModel)
    },
    nonDraggableAxisTicks(formatter: (value: number) => string) {
      return { tickValues: [], tickLabels: [] }
    }
  }))
interface ITestAxisProvider extends Instance<typeof TestAxisProvider> {}

describe("useAxis", () => {

  let provider: ITestAxisProvider
  let axisModel: IBaseNumericAxisModel
  let layout: SliderAxisLayout
  let axisElt: SVGGElement

  const mockDataDisplayModel = {
    type: "mock-model",
  } as IDataDisplayContentModel

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DataDisplayModelContext.Provider value={mockDataDisplayModel}>
      <AxisProviderContext.Provider value={provider}>
        <AxisLayoutContext.Provider value={layout}>
          {children}
        </AxisLayoutContext.Provider>
      </AxisProviderContext.Provider>
    </DataDisplayModelContext.Provider>
  )

  beforeEach(() => {
    provider = TestAxisProvider.create({ axis: { place: "bottom", min: 0, max: 10 }})
    axisModel = provider.axis
    layout = new SliderAxisLayout()
    axisElt = document.createElementNS("http://www.w3.org/2000/svg", "g")
  })

  it("renders a simple horizontal axis", () => {
    renderHook(() => useAxis("bottom"), { wrapper })
    expect(axisElt.querySelector(".axis")).toBeDefined()
    expect(axisElt.querySelector(".tick")).toBeDefined()
  })

  it("renders a simple vertical axis", () => {
    axisModel = NumericAxisModel.create({ place: "left", min: 0, max: 10 })
    renderHook(() => useAxis("left"), { wrapper })
    expect(axisElt.querySelector(".axis")).toBeDefined()
    expect(axisElt.querySelector(".tick")).toBeDefined()
  })

  it("updates scale when axis domain changes", () => {
    renderHook(() => useAxis("bottom"), { wrapper })
    axisModel.setDomain(0, 100)
    expect(layout.getAxisMultiScale("bottom")?.domain).toEqual([0, 100])
  })

  it("updates scale when axis range changes", () => {
    renderHook(() => useAxis("bottom"), { wrapper })
    layout.setTileExtent(100, 100)
    expect(layout.getAxisMultiScale("bottom")?.cellLength).toEqual(96)
  })

  it("can switch between linear/log axes", () => {
    renderHook(() => useAxis("bottom"), { wrapper })
    axisModel.setScale("log")
    expect(axisElt.querySelector(".axis")).toBeDefined()
    expect(axisElt.querySelector(".tick")).toBeDefined()
    axisModel.setScale("linear")
    expect(axisElt.querySelector(".axis")).toBeDefined()
    expect(axisElt.querySelector(".tick")).toBeDefined()
  })

  it("works without a DataDisplayModel", () => {
    renderHook(() => useAxis("bottom"), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <AxisProviderContext.Provider value={provider}>
          <AxisLayoutContext.Provider value={layout}>
            {children}
          </AxisLayoutContext.Provider>
        </AxisProviderContext.Provider>
      )
    })
    expect(axisElt.querySelector(".axis")).toBeDefined()
    expect(axisElt.querySelector(".tick")).toBeDefined()
  })

})
/* eslint-enable testing-library/no-node-access */
