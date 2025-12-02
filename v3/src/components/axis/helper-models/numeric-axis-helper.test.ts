import { select } from "d3"
import { NumericAxisHelper, INumericAxisHelperArgs } from "./numeric-axis-helper"
import { IAxisModel } from "../models/axis-model"
import { IDataDisplayContentModel } from "../../data-display/models/data-display-content-model"
import { IAxisLayout } from "../models/axis-layout-context"

jest.mock("d3", () => ({
  select: jest.fn().mockReturnValue({
    selectAll: jest.fn().mockReturnValue({
      remove: jest.fn()
    }),
    attr: jest.fn().mockReturnThis(),
    append: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    call: jest.fn().mockReturnThis(),
    transition: jest.fn().mockReturnThis(),
    duration: jest.fn().mockReturnThis()
  })
}))

describe("NumericAxisHelper", () => {
  let props: INumericAxisHelperArgs
  let numericAxisHelper: NumericAxisHelper

  beforeEach(() => {
    props = {
      displayModel: {} as IDataDisplayContentModel,
      axisProvider: {
        hasBinnedNumericAxis: jest.fn().mockReturnValue(false),
        hasDraggableNumericAxis: jest.fn().mockReturnValue(true),
        nonDraggableAxisTicks: jest.fn().mockReturnValue({ tickValues: [], tickLabels: [] }),
        getAxis: jest.fn(),
        getNumericAxis: jest.fn(),
        getAxisHelper: jest.fn(),
        setAxisHelper: jest.fn()
      },
      subAxisIndex: 0,
      subAxisElt: document.createElementNS("http://www.w3.org/2000/svg", "g"),
      axisModel: { place: "left" } as IAxisModel,
      layout: {
        getAxisMultiScale: jest.fn().mockReturnValue({ cellLength: 100 }),
        getComputedBounds: jest.fn().mockReturnValue({ left: 0, top: 0, width: 100, height: 100 }),
        getAxisLength: jest.fn().mockReturnValue(100)
      } as unknown as IAxisLayout,
      isAnimating: jest.fn().mockReturnValue(false),
      showScatterPlotGridLines: true
    }
    numericAxisHelper = new NumericAxisHelper(props)
  })

  it("should initialize correctly", () => {
    expect(numericAxisHelper.displayModel).toBe(props.displayModel)
    expect(numericAxisHelper.subAxisIndex).toBe(props.subAxisIndex)
    expect(numericAxisHelper.subAxisElt).toBe(props.subAxisElt)
    expect(numericAxisHelper.axisModel).toBe(props.axisModel)
    expect(numericAxisHelper.layout).toBe(props.layout)
    expect(numericAxisHelper.isAnimating).toBe(props.isAnimating)
    expect(numericAxisHelper.showScatterPlotGridLines).toBe(props.showScatterPlotGridLines)
  })

  it("should return correct newRange", () => {
    expect(numericAxisHelper.newRange).toEqual([100, 0])
  })

  // todo: fix this test
  it.skip("should render scatter plot grid lines correctly", () => {
    numericAxisHelper.renderScatterPlotGridLines()
    expect(select).toHaveBeenCalledWith(props.subAxisElt)
    expect(select(props.subAxisElt).selectAll).toHaveBeenCalledWith('.zero, .grid')
    expect(select(props.subAxisElt).append).toHaveBeenCalledWith('g')
    expect(select(props.subAxisElt).attr).toHaveBeenCalledWith('class', 'grid')
    expect(select(props.subAxisElt).call).toHaveBeenCalled()
    expect(select(props.subAxisElt).selectAll).toHaveBeenCalledWith('text')
    expect(select(props.subAxisElt).append).toHaveBeenCalledWith('g')
    expect(select(props.subAxisElt).attr).toHaveBeenCalledWith('class', 'zero')
    expect(select(props.subAxisElt).call).toHaveBeenCalled()
    expect(select(props.subAxisElt).selectAll).toHaveBeenCalledWith('text')
  })

  // todo: fix this test
  it.skip("should render correctly", () => {
    numericAxisHelper.render()
    expect(select).toHaveBeenCalledWith(props.subAxisElt)
    expect(select(props.subAxisElt).selectAll).toHaveBeenCalledWith('*')
    expect(select(props.subAxisElt).attr).toHaveBeenCalledWith("transform", "translate(100, 0)")
    expect(select(props.subAxisElt).transition).toHaveBeenCalled()
    expect(select(props.subAxisElt).call).toHaveBeenCalled()
    expect(select(props.subAxisElt).style).toHaveBeenCalledWith("stroke", "lightgrey")
    expect(select(props.subAxisElt).style).toHaveBeenCalledWith("stroke-opacity", "0.7")
  })
})
