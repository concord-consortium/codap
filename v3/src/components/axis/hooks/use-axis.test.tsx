/* eslint-disable testing-library/no-node-access */
import { renderHook } from "@testing-library/react"
import React from "react"
import { GraphLayout } from "../../graph/models/graph-layout"
import { AxisLayoutContext } from "../models/axis-layout-context"
import { INumericAxisModel, NumericAxisModel } from "../models/axis-model"
import {IUseAxis, useAxis} from "./use-axis"

describe("useNumericAxis", () => {

  let layout: GraphLayout
  let axisModel: INumericAxisModel
  let axisElt: SVGGElement
  let useAxisOptions: IUseAxis
  let titleRef: React.RefObject<SVGGElement>

  beforeEach(() => {
    layout = new GraphLayout()
    axisModel = NumericAxisModel.create({ place: "bottom", min: 0, max: 10 })
    axisElt = document.createElementNS("http://www.w3.org/2000/svg", "g")
    useAxisOptions = { axisModel, axisElt, titleRef, showGridLines: false }  })

  it("renders a simple horizontal axis", () => {
    renderHook(() => useAxis(useAxisOptions), {
      wrapper: ({ children }) => (
        <AxisLayoutContext.Provider value={layout}>
          {children}
        </AxisLayoutContext.Provider>
      )
    })
    expect(axisElt.querySelector(".axis")).toBeDefined()
    expect(axisElt.querySelector(".tick")).toBeDefined()
  })

  it("renders a simple vertical axis", () => {
    axisModel = NumericAxisModel.create({ place: "left", min: 0, max: 10 })
    renderHook(() => useAxis(useAxisOptions), {
      wrapper: ({ children }) => (
        <AxisLayoutContext.Provider value={layout}>
          {children}
        </AxisLayoutContext.Provider>
      )
    })
    expect(axisElt.querySelector(".axis")).toBeDefined()
    expect(axisElt.querySelector(".tick")).toBeDefined()
  })

  it("updates scale when axis domain changes", () => {
    renderHook(() => useAxis(useAxisOptions), {
      wrapper: ({ children }) => (
        <AxisLayoutContext.Provider value={layout}>
          {children}
        </AxisLayoutContext.Provider>
      )
    })
    axisModel.setDomain(0, 100)
    expect(layout.getAxisScale("bottom")?.domain()).toEqual([0, 100])
  })

  it("updates scale when axis range changes", () => {
    renderHook(() => useAxis(useAxisOptions), {
      wrapper: ({ children }) => (
        <AxisLayoutContext.Provider value={layout}>
          {children}
        </AxisLayoutContext.Provider>
      )
    })
    layout.setParentExtent(100, 100)
    expect(layout.getAxisScale("bottom")?.range()).toEqual([0, 80])
  })

  it("can switch between linear/log axes", () => {
    renderHook(() => useAxis(useAxisOptions), {
      wrapper: ({ children }) => (
        <AxisLayoutContext.Provider value={layout}>
          {children}
        </AxisLayoutContext.Provider>
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
