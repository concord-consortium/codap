import { renderHook } from "@testing-library/react"
import { Instance, types } from "mobx-state-tree"
import React from "react"
import { SliderAxisLayout } from "../../slider/slider-layout"
import { AxisPlace } from "../axis-types"
import { AxisHelper } from "../helper-models/axis-helper"
import { DateAxisHelper } from "../helper-models/date-axis-helper"
import { NumericAxisHelper } from "../helper-models/numeric-axis-helper"
import { AxisLayoutContext } from "../models/axis-layout-context"
import { IAxisModel } from "../models/axis-model"
import { DateAxisModel, isAnyNumericAxisModel, NumericAxisModel } from "../models/numeric-axis-models"
import { AxisProviderContext } from "./use-axis-provider-context"
import { useSubAxis } from "./use-sub-axis"

const TestAxisProvider = types
  .model("TestAxisProvider", {
    axis: types.union(NumericAxisModel, DateAxisModel)
  })
  .volatile(() => ({
    axisHelper: undefined as Maybe<AxisHelper>
  }))
  .views(self => ({
    getAxis() {
      return self.axis
    },
    getNumericAxis() {
      return self.axis
    },
    getAxisHelper(place: AxisPlace, subAxisIndex: number) {
      return self.axisHelper
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
  .actions(self => ({
    setAxisHelper(place: AxisPlace, subAxisIndex: number, helper: AxisHelper) {
      self.axisHelper = helper
    },
    // Replaces the axis the way undo does: by applying a snapshot, without going through any
    // action that would also discard the helper built for the previous axis.
    replaceAxis(snapshot: any) {
      self.axis = snapshot
    }
  }))
interface ITestAxisProvider extends Instance<typeof TestAxisProvider> {}

describe("useSubAxis", () => {
  let provider: ITestAxisProvider
  let layout: SliderAxisLayout
  let subAxisElt: SVGGElement

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AxisProviderContext.Provider value={provider}>
      <AxisLayoutContext.Provider value={layout}>
        {children}
      </AxisLayoutContext.Provider>
    </AxisProviderContext.Provider>
  )

  beforeEach(() => {
    provider = TestAxisProvider.create({
      axis: { type: "date", place: "bottom", min: 1767254400, max: 1798790399 }
    })
    layout = new SliderAxisLayout()
    layout.setTileExtent(300, 50)
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    subAxisElt = document.createElementNS("http://www.w3.org/2000/svg", "g")
    svg.appendChild(subAxisElt)
    document.body.appendChild(svg)
  })

  it("doesn't render a helper built for an axis that has since been replaced", () => {
    // A date helper given a replaced (and therefore dead) date axis model reads a placeholder domain
    // as calendar years and lays out ticks for a whole year, which freezes the browser. Stub it out so
    // the test can count the calls instead.
    const dateRender = jest.spyOn(DateAxisHelper.prototype, "render").mockImplementation(() => undefined)
    const numericRender = jest.spyOn(NumericAxisHelper.prototype, "render").mockImplementation(() => undefined)

    renderHook(() => useSubAxis({
      subAxisIndex: 0, axisPlace: "bottom", subAxisEltRef: { current: subAxisElt },
      showScatterPlotGridLines: false, showZeroAxisLine: false, centerCategoryLabels: false
    }), { wrapper })
    const dateHelper = provider.axisHelper
    expect(dateHelper).toBeInstanceOf(DateAxisHelper)

    // In the order the reactions run when the axis is replaced, a render request reaches the
    // provider before the replacement helper does.
    dateRender.mockClear()
    provider.replaceAxis({ type: "numeric", place: "bottom", min: -0.5, max: 11.5 })
    expect(dateRender).not.toHaveBeenCalled()
    expect(provider.axisHelper).toBeInstanceOf(NumericAxisHelper)
    expect(numericRender).toHaveBeenCalled()

    // The same must hold whatever order the reactions run in, so put the stale helper back and
    // request a render directly.
    dateRender.mockClear()
    provider.setAxisHelper("bottom", 0, dateHelper!)
    layout.setTileExtent(400, 50)
    expect(dateRender).not.toHaveBeenCalled()

    dateRender.mockRestore()
    numericRender.mockRestore()
  })
})
