// Tests for the AxisHelper class
import { select } from "d3"
import { IDataDisplayContentModel } from "../../data-display/models/data-display-content-model"
import { IAxisLayout } from "../models/axis-layout-context"
import { IAxisModel } from "../models/axis-model"
import { IAxisProvider } from "../models/axis-provider"
import { AxisHelper, IAxisHelperArgs } from "./axis-helper"

jest.mock("d3", () => ({
  select: jest.fn().mockReturnValue({
    selectAll: jest.fn().mockReturnValue({
      remove: jest.fn()
    }),
    attr: jest.fn().mockReturnThis(),
    append: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis()
  })
}))

describe("AxisHelper", () => {
  let props: IAxisHelperArgs
  let axisHelper: AxisHelper

  beforeEach(() => {
    props = {
      displayModel: {
        dataConfiguration: {}
      } as IDataDisplayContentModel,
      axisProvider: {} as IAxisProvider,
      subAxisIndex: 0,
      subAxisElt: document.createElementNS("http://www.w3.org/2000/svg", "g"),
      axisModel: { place: "left" } as IAxisModel,
      layout: {
        getAxisMultiScale: jest.fn().mockReturnValue({ cellLength: 100 }),
        getComputedBounds: jest.fn().mockReturnValue({ left: 0, top: 0, width: 100, height: 100 })
      } as unknown as IAxisLayout,
      isAnimating: jest.fn().mockReturnValue(false)
    }
    axisHelper = new AxisHelper(props)
  })

  it("should initialize correctly", () => {
    expect(axisHelper.displayModel).toBe(props.displayModel)
    expect(axisHelper.subAxisIndex).toBe(props.subAxisIndex)
    expect(axisHelper.subAxisElt).toBe(props.subAxisElt)
    expect(axisHelper.axisModel).toBe(props.axisModel)
    expect(axisHelper.layout).toBe(props.layout)
    expect(axisHelper.isAnimating).toBe(props.isAnimating)
    expect(axisHelper.multiScale).toEqual({ cellLength: 100 })
  })

  it("should return correct axisPlace", () => {
    expect(axisHelper.axisPlace).toBe("left")
  })

  it("should return correct dataConfig", () => {
    expect(axisHelper.dataConfig).toBe(props.displayModel?.dataConfiguration)
  })

  it("should return correct initialTransform", () => {
    expect(axisHelper.initialTransform).toBe("translate(100, 0)")
  })

  it("should return correct isVertical", () => {
    expect(axisHelper.isVertical).toBe(true)
  })

  it("should return correct subAxisLength", () => {
    expect(axisHelper.subAxisLength).toBe(100)
  })

  it("should return correct axis", () => {
    expect(axisHelper.axisModel).toBeDefined()
  })

  it("should return correct rangeMin", () => {
    expect(axisHelper.rangeMin).toBe(0)
  })

  it("should return correct rangeMax", () => {
    expect(axisHelper.rangeMax).toBe(100)
  })

  it("should render axis line correctly", () => {
    axisHelper.renderAxisLine()
    expect(select).toHaveBeenCalledWith(props.subAxisElt)
    expect(select(props.subAxisElt).attr).toHaveBeenCalledWith("transform", "translate(100, 0)")
    expect(select(props.subAxisElt).append).toHaveBeenCalledWith('line')
    expect(select(props.subAxisElt).style).toHaveBeenCalledWith("stroke", "darkgray")
    expect(select(props.subAxisElt).style).toHaveBeenCalledWith("stroke-opacity", "0.7")
  })
})
