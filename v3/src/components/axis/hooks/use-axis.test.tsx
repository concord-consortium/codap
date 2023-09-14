/* eslint-disable testing-library/no-node-access */
import { renderHook } from "@testing-library/react"
import React from "react"
import { SliderAxisLayout } from "../../slider/slider-layout"
import { AxisLayoutContext } from "../models/axis-layout-context"
import { INumericAxisModel, NumericAxisModel } from "../models/axis-model"
import {IUseAxis, useAxis} from "./use-axis"
import { AxisProviderContext, IAxisProvider } from "./use-axis-provider-context"

describe("useNumericAxis", () => {

  let provider: IAxisProvider
  let layout: SliderAxisLayout
  let axisModel: INumericAxisModel
  let axisElt: SVGGElement
  let useAxisOptions: IUseAxis

  beforeEach(() => {
    provider = {
      getAxis: () => axisModel,
      getNumericAxis: () => axisModel
    }
    layout = new SliderAxisLayout()
    axisModel = NumericAxisModel.create({ place: "bottom", min: 0, max: 10 })
    axisElt = document.createElementNS("http://www.w3.org/2000/svg", "g")
    useAxisOptions = { axisPlace: "bottom", centerCategoryLabels: true }
  })

  it("renders a simple horizontal axis", () => {
    renderHook(() => useAxis(useAxisOptions), {
      wrapper: ({ children }) => (
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

  it("renders a simple vertical axis", () => {
    axisModel = NumericAxisModel.create({ place: "left", min: 0, max: 10 })
    renderHook(() => useAxis(useAxisOptions), {
      wrapper: ({ children }) => (
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

  it("updates scale when axis domain changes", () => {
    renderHook(() => useAxis(useAxisOptions), {
      wrapper: ({ children }) => (
        <AxisProviderContext.Provider value={provider}>
          <AxisLayoutContext.Provider value={layout}>
            {children}
          </AxisLayoutContext.Provider>
        </AxisProviderContext.Provider>
      )
    })
    axisModel.setDomain(0, 100)
    expect(layout.getAxisMultiScale("bottom")?.domain).toEqual([0, 100])
  })

  it("updates scale when axis range changes", () => {
    renderHook(() => useAxis(useAxisOptions), {
      wrapper: ({ children }) => (
        <AxisProviderContext.Provider value={provider}>
          <AxisLayoutContext.Provider value={layout}>
            {children}
          </AxisLayoutContext.Provider>
        </AxisProviderContext.Provider>
      )
    })
    layout.setParentExtent(100, 100)
    expect(layout.getAxisMultiScale("bottom")?.cellLength).toEqual(96)
  })

  it("can switch between linear/log axes", () => {
    renderHook(() => useAxis(useAxisOptions), {
      wrapper: ({ children }) => (
        <AxisProviderContext.Provider value={provider}>
          <AxisLayoutContext.Provider value={layout}>
            {children}
          </AxisLayoutContext.Provider>
        </AxisProviderContext.Provider>
      )
    })
    axisModel.setScale("log")
    expect(axisElt.querySelector(".axis")).toBeDefined()
    expect(axisElt.querySelector(".tick")).toBeDefined()
    axisModel.setScale("linear")
    expect(axisElt.querySelector(".axis")).toBeDefined()
    expect(axisElt.querySelector(".tick")).toBeDefined()
  })
})
/* eslint-enable testing-library/no-node-access */
