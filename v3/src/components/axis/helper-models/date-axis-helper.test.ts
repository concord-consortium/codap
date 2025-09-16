import { select, Selection } from "d3"
import { MutableRefObject } from "react"
import { IDataDisplayContentModel } from "../../data-display/models/data-display-content-model"
import { IAxisLayout } from "../models/axis-layout-context"
import { IAxisProvider } from "../models/axis-provider"
import { IDateAxisModel } from "../models/numeric-axis-models"
import { DateAxisHelper, IDateAxisHelperArgs } from "./date-axis-helper"

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

describe("DateAxisHelper", () => {
  let props: IDateAxisHelperArgs
  let dateAxisHelper: DateAxisHelper
  let subAxisSelectionRef: MutableRefObject<Selection<SVGGElement, any, any, any> | undefined>

  beforeEach(() => {
    subAxisSelectionRef =
      { current: select(document.createElementNS("http://www.w3.org/2000/svg",
          "g")) } as MutableRefObject<Selection<SVGGElement, any, any, any> | undefined>
    props = {
      displayModel: {} as IDataDisplayContentModel,
      axisProvider: {} as IAxisProvider,
      subAxisIndex: 0,
      subAxisElt: document.createElementNS("http://www.w3.org/2000/svg", "g"),
      axisModel: {
        place: "left",
        domain: [0, 100],
        min: 0,
        max: 100,
        type: undefined,
        scale: undefined,
        lockZero: undefined
      } as unknown as IDateAxisModel,
      layout: {
        getAxisMultiScale: jest.fn().mockReturnValue({ cellLength: 100 }),
        getComputedBounds: jest.fn().mockReturnValue({ left: 0, top: 0, width: 100, height: 100 }),
        getAxisLength: jest.fn().mockReturnValue(100)
      } as unknown as IAxisLayout,
      isAnimating: jest.fn().mockReturnValue(false),
      showScatterPlotGridLines: false,
      subAxisSelectionRef
    }
    dateAxisHelper = new DateAxisHelper(props)
  })

  it("should initialize correctly", () => {
    expect(dateAxisHelper.displayModel).toBe(props.displayModel)
    expect(dateAxisHelper.subAxisIndex).toBe(props.subAxisIndex)
    expect(dateAxisHelper.subAxisElt).toBe(props.subAxisElt)
    expect(dateAxisHelper.axisModel).toBe(props.axisModel)
    expect(dateAxisHelper.layout).toBe(props.layout)
    expect(dateAxisHelper.isAnimating).toBe(props.isAnimating)
    expect(dateAxisHelper.subAxisSelectionRef).toBe(props.subAxisSelectionRef)
  })

  it.skip("should render correctly", () => {
    dateAxisHelper.render()
    expect(select).toHaveBeenCalledWith(props.subAxisElt)
    expect(select(props.subAxisElt).selectAll).toHaveBeenCalledWith('*')
    expect(select(props.subAxisElt).attr).toHaveBeenCalledWith("transform", "translate(100, 0)")
    expect(select(props.subAxisElt).transition).toHaveBeenCalled()
    expect(select(props.subAxisElt).call).toHaveBeenCalled()
    expect(select(props.subAxisElt).style).toHaveBeenCalledWith("stroke", "lightgrey")
    expect(select(props.subAxisElt).style).toHaveBeenCalledWith("stroke-opacity", "0.7")
  })
})
