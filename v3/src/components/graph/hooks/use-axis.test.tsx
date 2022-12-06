/* eslint-disable testing-library/no-node-access */
import { renderHook } from "@testing-library/react"
import React from "react"
import { INumericAxisModel, NumericAxisModel } from "../models/axis-model"
import { GraphLayout, GraphLayoutContext, ScaleType } from "../models/graph-layout"
import {IUseAxis, useAxis} from "./use-axis"

describe("useNumericAxis", () => {

  let layout: GraphLayout
  let axisModel: INumericAxisModel
  let axisElt: SVGGElement
  let useAxisOptions: IUseAxis
  let titleRef: React.RefObject<SVGGElement>
  let scale: ScaleType
  let inGraph: boolean

  beforeEach(() => {
    layout = new GraphLayout()
    axisModel = NumericAxisModel.create({ place: "bottom", min: 0, max: 10 })
    axisElt = document.createElementNS("http://www.w3.org/2000/svg", "g")
    useAxisOptions = { axisModel, axisElt, titleRef, scale, inGraph: true, enableAnimation: { current: false }, showGridLines: false }
  })

  it("renders a simple horizontal axis", () => {
    renderHook(() => useAxis(useAxisOptions))
    expect(axisElt.querySelector(".axis")).toBeDefined()
    expect(axisElt.querySelector(".tick")).toBeDefined()
  })

  it("renders a simple vertical axis", () => {
    axisModel = NumericAxisModel.create({ place: "left", min: 0, max: 10 })
    renderHook(() => useAxis(useAxisOptions))
    expect(axisElt.querySelector(".axis")).toBeDefined()
    expect(axisElt.querySelector(".tick")).toBeDefined()
  })

  it("updates scale when axis domain changes", () => {
    renderHook(() => useAxis(useAxisOptions), {
      wrapper: ({ children }) => (
        <GraphLayoutContext.Provider value={layout}>
          {children}
        </GraphLayoutContext.Provider>
      )
    })
    axisModel.setDomain(0, 100)
    expect(layout.axisScale("bottom")?.domain()).toEqual([0, 100])
  })

  it("updates scale when axis range changes", () => {
    renderHook(() => useAxis(useAxisOptions), {
      wrapper: ({ children }) => (
        <GraphLayoutContext.Provider value={layout}>
          {children}
        </GraphLayoutContext.Provider>
      )
    })
    layout.setGraphExtent(100, 100)
    expect(layout.axisScale("bottom")?.range()).toEqual([0, 80])
  })

  it("can switch between linear/log axes", () => {
    renderHook(() => useAxis(useAxisOptions))
    axisModel.setScale("log")
    expect(axisElt.querySelector(".axis")).toBeDefined()
    expect(axisElt.querySelector(".tick")).toBeDefined()
    axisModel.setScale("linear")
    expect(axisElt.querySelector(".axis")).toBeDefined()
    expect(axisElt.querySelector(".tick")).toBeDefined()
  })
})
/* eslint-enable testing-library/no-node-access */
